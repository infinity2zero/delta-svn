#[cfg(test)]
mod tests {
    use crate::svn::{parse_status_line, map_status, build_remote_url, parse_remote_entries};

    #[test]
    fn test_parse_status_line() {
        let test_cases = vec![
            ("C    conflicted.txt", Some(("conflicted.txt", "CONFLICTED"))),
            ("M    modified.txt", Some(("modified.txt", "MODIFIED"))),
            ("A    added.txt", Some(("added.txt", "ADDED"))),
            ("D    deleted.txt", Some(("deleted.txt", "DELETED"))),
            ("?    unversioned.txt", Some(("unversioned.txt", "UNVERSIONED"))),
            ("", None),
            ("        ", None),
        ];

        for (input, expected) in test_cases {
            let result = parse_status_line(input);
            match expected {
                Some((expected_path, expected_status)) => {
                    assert!(result.is_some());
                    let entry = result.unwrap();
                    assert_eq!(entry.name, expected_path);
                    assert_eq!(entry.status, expected_status);
                }
                None => assert!(result.is_none()),
            }
        }
    }

    #[test]
    fn test_map_status() {
        assert_eq!(map_status('C'), "CONFLICTED");
        assert_eq!(map_status('M'), "MODIFIED");
        assert_eq!(map_status('A'), "ADDED");
        assert_eq!(map_status('D'), "DELETED");
        assert_eq!(map_status('?'), "UNVERSIONED");
        assert_eq!(map_status('R'), "REPLACED");
        assert_eq!(map_status('!'), "MISSING");
        assert_eq!(map_status('X'), "NORMAL"); // Unknown status
    }

    #[test]
    fn test_build_remote_url() {
        assert_eq!(
            build_remote_url("svn://server/repo", "trunk"),
            "svn://server/repo/trunk"
        );
        assert_eq!(
            build_remote_url("svn://server/repo/", "trunk"),
            "svn://server/repo/trunk"
        );
        assert_eq!(
            build_remote_url("svn://server/repo", "/trunk"),
            "svn://server/repo/trunk"
        );
        assert_eq!(
            build_remote_url("svn://server/repo", ""),
            "svn://server/repo"
        );
        assert_eq!(
            build_remote_url("svn://server/repo", "/"),
            "svn://server/repo"
        );
    }

    #[test]
    fn test_parse_remote_entries() {
        let output = "trunk/\nbranches/\ntags/\nfile.txt\n";
        let entries = parse_remote_entries(output);

        assert_eq!(entries.len(), 4);
        assert_eq!(entries[0].name, "trunk");
        assert_eq!(entries[0].kind, "directory");
        assert_eq!(entries[3].name, "file.txt");
        assert_eq!(entries[3].kind, "file");
    }
}

