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
    url.path_segments()
        .and_then(|mut s| s.next_back().map(str::to_string))
        .filter(|s| !s.is_empty())
        .map(|s| s.chars().take(120).collect())
        .unwrap_or_else(|| "image".into())
}

pub async fn download(raw: &str) -> Result<Downloaded, String> {
    let url = check_url(raw)?;
    if rustls::crypto::CryptoProvider::get_default().is_none() {
        let _ = rustls::crypto::ring::default_provider().install_default();
    }
    let client = reqwest::Client::builder()
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
        .map_err(|_| "Couldn't start the download.".to_string())?;
    let mut response = client
        .get(url.clone())
        .send()
        .await
        .map_err(|_| "Couldn't reach that link. Check it and your connection.".to_string())?;
    if !response.status().is_success() {
        return Err(format!(
            "That link returned an error ({}).",
            response.status().as_u16()
        ));
    }
    if response.content_length().is_some_and(|n| n > MAX_BYTES) {
        return Err("That image is over 15 MB. Try a smaller one.".into());
    }
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
    Ok(Downloaded {
        name: file_name(response.url()),
        bytes,
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
    }
}
