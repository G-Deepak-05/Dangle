//! Feedback never leaves the app on its own: we only build a pre-filled GitHub issue
//! link and hand it to the user's browser, where they review it before posting.

use serde::{Deserialize, Serialize};

pub const REPO_URL: &str = "https://github.com/G-Deepak-05/Dangle";
const MAX_MESSAGE_CHARS: usize = 4000;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum FeedbackKind {
    Bug,
    Idea,
    Other,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub version: String,
    pub os: String,
    pub arch: String,
}

pub fn app_info(version: &str) -> AppInfo {
    AppInfo {
        version: version.to_string(),
        os: match std::env::consts::OS {
            "macos" => "macOS".into(),
            "windows" => "Windows".into(),
            other => other.into(),
        },
        arch: std::env::consts::ARCH.into(),
    }
}

fn encode(input: &str) -> String {
    let mut out = String::with_capacity(input.len() * 3);
    for b in input.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

pub fn issue_url(kind: FeedbackKind, message: &str, info: Option<&AppInfo>) -> String {
    let message: String = message.chars().take(MAX_MESSAGE_CHARS).collect();
    let message = message.trim();
    let (label, prefix) = match kind {
        FeedbackKind::Bug => ("bug", "Bug"),
        FeedbackKind::Idea => ("enhancement", "Idea"),
        FeedbackKind::Other => ("feedback", "Feedback"),
    };
    let first_line: String = message
        .lines()
        .next()
        .unwrap_or("")
        .chars()
        .take(60)
        .collect();
    let title = if first_line.trim().is_empty() {
        format!("{prefix}: ")
    } else {
        format!("{prefix}: {}", first_line.trim())
    };
    let mut body = if message.is_empty() {
        "<!-- Tell us what happened or what you'd like to see. -->".to_string()
    } else {
        message.to_string()
    };
    if let Some(info) = info {
        body.push_str(&format!(
            "\n\n---\nDangle {} · {} · {}",
            info.version, info.os, info.arch
        ));
    }
    format!(
        "{REPO_URL}/issues/new?labels={}&title={}&body={}",
        encode(label),
        encode(&title),
        encode(&body)
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_a_prefilled_issue_url() {
        let info = AppInfo {
            version: "0.1.2".into(),
            os: "macOS".into(),
            arch: "aarch64".into(),
        };
        let url = issue_url(
            FeedbackKind::Bug,
            "Charm vanished & won't return\nsteps…",
            Some(&info),
        );
        assert!(url.starts_with(
            "https://github.com/G-Deepak-05/Dangle/issues/new?labels=bug&title=Bug%3A%20Charm"
        ));
        assert!(url.contains("%26"));
        assert!(url.contains("Dangle%200.1.2"));
        assert!(!url.contains(' '));
    }

    #[test]
    fn caps_message_length() {
        let long = "a".repeat(10_000);
        let url = issue_url(FeedbackKind::Other, &long, None);
        assert!(url.len() < 4_400);
    }
}
