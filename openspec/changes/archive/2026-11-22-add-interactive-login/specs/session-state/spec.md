# Spec Delta

## MODIFIED Requirements

### Requirement: First block starts clean
The first block SHALL start in a new browser context with no open page. When the configuration has no `auth`, that context SHALL have no cookies or storage, and each build SHALL start from such a context regardless of earlier builds. When it has `auth`, the context starts from the saved session as the saved-login capability describes.

#### Scenario: Repeat builds are independent
- **WHEN** a build with no `auth` configured logs in or adds items and the same document is built again
- **THEN** the second build's first block starts with no cookies or stored data from the first

#### Scenario: Configured login
- **WHEN** the configuration has `auth` and a valid session was saved
- **THEN** the first block starts with the saved cookies and storage and no open page
