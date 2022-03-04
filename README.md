# Weekly Commits

Aggregates commits across an organization by week number of the current year. 

This a work in progress, only outputting commits. Todos:
* Improve command line output, print out date range to confirm week number dates
* Provide percentages of work per repo based on commits and number of files changed
* Explore providing look-through into repo folders for percentages across monorepos
* Provide pretty output, either at command line or with web page

## config.json

The script requires a `config.json` file in the project root with the following:

```json
{
    "org": "<org>",
    "auth": "<personal_auth_token>"
}
```

## Running

Execute by running the script with command line parameters:
1. Github username
2. Week number

Example:

```
node index.mjs bwells78 10
```
