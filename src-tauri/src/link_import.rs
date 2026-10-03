//! Downloads one image the user pasted a link to. Nothing is fetched unless they ask, the
//! bytes go straight to the same local validation as a picked file, and local or private
//! network addresses are refused so a link can't be used to poke at the user's network.

use std::net::IpAddr;
use std::time::Duration;
use url::{Host, Url};

pub const MAX_BYTES: u64 = 15 * 1024 * 1024;
const TIMEOUT: Duration = Duration::from_secs(20);

pub struct Downloaded {
    pub name: String,
    pub bytes: Vec<u8>,
}

fn private_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            v4.is_private()
                || v4.is_loopback()
                || v4.is_link_local()
                || v4.is_unspecified()
                || v4.is_broadcast()
                || v4.octets()[0] == 100 && (64..128).contains(&v4.octets()[1])
        }
        IpAddr::V6(v6) => {
            v6.is_loopback()
                || v6.is_unspecified()
                || (v6.segments()[0] & 0xfe00) == 0xfc00
                || (v6.segments()[0] & 0xffc0) == 0xfe80
        }
    }
}

/// Checks the link before anything is requested.
pub fn check_url(raw: &str) -> Result<Url, String> {
    let url = Url::parse(raw.trim()).map_err(|_| "That doesn't look like a link.".to_string())?;
    if url.scheme() != "https" && url.scheme() != "http" {
        return Err("Use a link that starts with https://".into());
    }
    let blocked = match url.host() {
        None => true,
        Some(Host::Ipv4(ip)) => private_ip(IpAddr::V4(ip)),
        Some(Host::Ipv6(ip)) => private_ip(IpAddr::V6(ip)),
        Some(Host::Domain(d)) => {
            let d = d.to_ascii_lowercase();
            d == "localhost"
                || d.ends_with(".localhost")
                || d.ends_with(".local")
                || d.ends_with(".internal")
        }
    };
    if blocked {
        return Err("Links to your own computer or local network aren't allowed.".into());
    }
    Ok(url)
}

fn file_name(url: &Url) -> String {
    let segments: Vec<String> = url
        .path_segments()
        .map(|s| s.filter(|p| !p.is_empty()).map(str::to_string).collect())
        .unwrap_or_default();
    // Wiki CDNs end paths in ".../Name.png/revision/latest"; use the real file name.
    let pick = match segments.iter().position(|s| s == "revision") {
        Some(i) if i > 0 => segments.get(i - 1),
        _ => segments.last(),
    };
    pick.map(|s| {
        url::form_urlencoded::parse(s.as_bytes())
            .map(|(k, _)| k)
            .collect::<String>()
            .chars()
            .take(120)
            .collect()
    })
    .unwrap_or_else(|| "image".into())
}

fn client() -> Result<reqwest::Client, String> {
    if rustls::crypto::CryptoProvider::get_default().is_none() {
        let _ = rustls::crypto::ring::default_provider().install_default();
    }
    reqwest::Client::builder()
        .timeout(TIMEOUT)
        .redirect(reqwest::redirect::Policy::custom(|attempt| {
            if attempt.previous().len() > 5 || check_url(attempt.url().as_str()).is_err() {
                attempt.stop()
            } else {
                attempt.follow()
            }
        }))
        .user_agent(concat!("Dangle/", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|_| "Couldn't start the download.".to_string())
}

struct Fetched {
    url: Url,
    status: u16,
    is_html: bool,
    bytes: Vec<u8>,
}

async fn fetch(client: &reqwest::Client, url: Url) -> Result<Fetched, String> {
    let mut response = client
        .get(url)
        .send()
        .await
        .map_err(|_| "Couldn't reach that link. Check it and your connection.".to_string())?;
    if response.content_length().is_some_and(|n| n > MAX_BYTES) {
        return Err("That image is over 15 MB. Try a smaller one.".into());
    }
    let is_html = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.contains("text/html"));
    let status = response.status().as_u16();
    let url = response.url().clone();
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "The download was interrupted.".to_string())?
    {
        bytes.extend_from_slice(&chunk);
        if bytes.len() as u64 > MAX_BYTES {
            return Err("That image is over 15 MB. Try a smaller one.".into());
        }
    }
    Ok(Fetched {
        url,
        status,
        is_html,
        bytes,
    })
}

/// The page's main picture, as announced for link previews (og:image and friends).
fn preview_image(html: &str, base: &Url) -> Option<Url> {
    let lower = html.to_ascii_lowercase();
    for key in ["og:image", "twitter:image", "image_src"] {
        let mut from = 0;
        while let Some(pos) = lower[from..].find(key) {
            let at = from + pos;
            from = at + key.len();
            let tag_start = lower[..at].rfind('<')?;
            let tag_end = at + lower[at..].find('>')?;
            let tag = &html[tag_start..tag_end];
            let tag_lower = &lower[tag_start..tag_end];
            let attr = if tag_lower.contains("content=") {
                "content="
            } else {
                "href="
            };
            let Some(i) = tag_lower.find(attr) else {
                continue;
            };
            let rest = &tag[i + attr.len()..];
            let quote = rest.chars().next()?;
            if quote != '"' && quote != '\'' {
                continue;
            }
            let value = rest[1..].split(quote).next()?.replace("&amp;", "&");
            if let Ok(url) = base.join(value.trim()) {
                return Some(url);
            }
        }
    }
    None
}

/// For wiki pages (MediaWiki, including Fandom), ask the wiki's API for the page image.
async fn wiki_image(client: &reqwest::Client, page: &Url) -> Option<Url> {
    let path = page.path();
    let title = path.split("/wiki/").nth(1)?.split('/').next()?;
    let mut api = page.join("/api.php").ok()?;
    api.query_pairs_mut()
        .append_pair("action", "query")
        .append_pair("prop", "pageimages")
        .append_pair("piprop", "original")
        .append_pair("format", "json")
        .append_pair(
            "titles",
            &url::form_urlencoded::parse(title.as_bytes())
                .map(|(k, _)| k)
                .collect::<String>(),
        );
    let fetched = fetch(client, check_url(api.as_str()).ok()?).await.ok()?;
    let json: serde_json::Value = serde_json::from_slice(&fetched.bytes).ok()?;
    let pages = json.get("query")?.get("pages")?.as_object()?;
    let source = pages
        .values()
        .find_map(|p| p.get("original")?.get("source")?.as_str())?;
    Url::parse(source).ok()
}

fn looks_like_image(bytes: &[u8]) -> bool {
    bytes.starts_with(&[0x89, b'P', b'N', b'G'])
        || bytes.starts_with(&[0xff, 0xd8, 0xff])
        || (bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP")
}

pub async fn download(raw: &str) -> Result<Downloaded, String> {
    let url = check_url(raw)?;
    let client = client()?;
    let mut fetched = fetch(&client, url.clone()).await?;

    // A web page instead of an image: follow it to the page's main picture.
    if !looks_like_image(&fetched.bytes) && (fetched.is_html || fetched.status >= 400) {
        let html = String::from_utf8_lossy(&fetched.bytes).to_string();
        let found = match preview_image(&html, &fetched.url) {
            Some(u) => Some(u),
            None => wiki_image(&client, &url).await,
        };
        let Some(image_url) = found else {
            return Err(
                "That page didn't share an image Dangle could find. Right-click the picture and choose \"Copy Image Address\", then paste that.".into(),
            );
        };
        fetched = fetch(&client, check_url(image_url.as_str())?).await?;
    }

    if fetched.status >= 400 {
        return Err(format!("That link returned an error ({}).", fetched.status));
    }
    if !looks_like_image(&fetched.bytes) {
        return Err("That link isn't a PNG, WebP, or JPEG image.".into());
    }
    Ok(Downloaded {
        name: file_name(&fetched.url),
        bytes: fetched.bytes,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_public_https_links() {
        assert!(check_url("https://example.com/cat.png").is_ok());
        assert!(check_url("  http://cdn.example.org/a/b.webp ").is_ok());
    }

    #[test]
    fn refuses_other_schemes_and_local_addresses() {
        for bad in [
            "file:///etc/passwd",
            "javascript:alert(1)",
            "ftp://example.com/a.png",
            "http://localhost:8080/x.png",
            "http://127.0.0.1/x.png",
            "http://192.168.1.10/x.png",
            "http://10.0.0.5/x.png",
            "http://169.254.169.254/latest",
            "http://[::1]/x.png",
            "http://printer.local/x.png",
            "not a url",
        ] {
            assert!(check_url(bad).is_err(), "{bad} should be refused");
        }
    }

    #[test]
    fn names_files_from_the_path() {
        assert_eq!(
            file_name(&Url::parse("https://a.com/x/fox.png?s=1").unwrap()),
            "fox.png"
        );
        assert_eq!(file_name(&Url::parse("https://a.com/").unwrap()), "image");
        assert_eq!(
            file_name(&Url::parse("https://static.wikia.nocookie.net/x/images/3/36/Naruto_Uzumaki.png/revision/latest?cb=1").unwrap()),
            "Naruto_Uzumaki.png"
        );
    }

    #[test]
    fn finds_preview_images_in_pages() {
        let base = Url::parse("https://example.com/post/1").unwrap();
        let html = r#"<head><meta property="og:image" content="/img/a.webp?x=1&amp;y=2"></head>"#;
        assert_eq!(
            preview_image(html, &base).unwrap().as_str(),
            "https://example.com/img/a.webp?x=1&y=2"
        );
        let html2 = r#"<meta content='https://cdn.example.com/b.png' name='twitter:image'>"#;
        assert_eq!(
            preview_image(html2, &base).unwrap().as_str(),
            "https://cdn.example.com/b.png"
        );
        assert!(preview_image("<p>no image</p>", &base).is_none());
    }
}
