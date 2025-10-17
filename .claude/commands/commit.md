Create a commit based on following rules


RULES FOR COMMITTING CHANGES:

## Contribution

For Merge Requests please use described convention for:

### Types

| Type     | Description                                                      | Example                          |
| -------- | ---------------------------------------------------------------- |----------------------------------|
| fix      | a bug fix                                                        | fix/Validation-not-firing        |
| feat     | a new feature                                                    | feat/Add-printer-support         |
| refactor | code change that neither fixes a bug or introduces a new feature | refactor/Make-prep-screen-faster |
| chore    | changes to the build process or auxiliary tools                  | chore/update-ci-for-staging      |
| docs     | documentation only changes                                       | docs/update-readme               |
| style    | formatting changes, code style                                   | style/perform-prettier           |
| test     | adding missing tests                                             | test/orders-utils                |

### Commit messages

Commit messages should follow <https://www.conventionalcommits.org/> convention.
Long story short: should contain type, scope and for fix/feat/refactor should reference JIRA issue prefixed with '#' (hash sign).
Commit subject should be a simple sentence in present simple tense. For example:

```bash
git commit -m 'feat: Add printer support'

git commit -m 'fix: #Validation is not firing when creating kitchen'
```

```
### Git flow
To start work on some tasks create new branch from master, after merge to master pipeline automatically install changes on DEV.
#### IMPORTANT
#### Please use `git rebase` instead of `git merge`.

## Releases

Project uses `standard-version` package to prepare release:

- bumps project version
- generates changelog
- creates a commit with a new version and updated changelog
- creates new tag with the new version number

CI takes care of release process
