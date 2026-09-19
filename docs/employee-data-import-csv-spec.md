# Employee Data CSV Specification

This specification defines the CSV format that client organisations must provide for employee master-data import.

## Scope

- One CSV file belongs to one client organisation.
- The company is determined by the org admin performing the import.
- Do not include company-identification columns such as `co_id`, `co_name`, `business`, or `location` in the CSV.

## Encoding And File Rules

- File format: CSV
- Encoding: UTF-8
- Delimiter: comma `,`
- Header row: required
- Date format: `DD-MM-YYYY`
- Empty optional values: leave blank
- Recommended filename pattern: `employee-data-<company-name>-YYYY-MM-DD.csv`

## Supported Columns

| Column | Required | Type | Rules |
| --- | --- | --- | --- |
| `email` | Yes | string | Must be a valid email address. Must be globally unique across the platform. |
| `first_name` | No | string | Employee first name. |
| `last_name` | No | string | Employee last name. |
| `emp_id` | No | integer | Employee identifier used for manager mapping and downstream workflows. |
| `date_of_joining` | No | date | Format must be `DD-MM-YYYY`. |
| `last_role_change` | No | date | Format must be `DD-MM-YYYY`. |

## Required Header Row

```csv
email,first_name,last_name,emp_id,date_of_joining,last_role_change
```

## Example File

```csv
email,first_name,last_name,emp_id,date_of_joining,last_role_change
alex.mukherjee@example.com,Alex,Mukherjee,100231,15-04-2024,10-01-2025
priya.nair@example.com,Priya,Nair,100232,01-11-2023,
rahul.sen@example.com,Rahul,Sen,100233,,
```

## Validation Rules

- `email` is mandatory for every row.
- Duplicate `email` values inside the same file are invalid.
- If `emp_id` is provided, it should be unique within the client organisation's dataset.
- `date_of_joining` and `last_role_change` must be valid calendar dates in `DD-MM-YYYY` format.
- Columns not listed in this specification should not be included.

## Columns Intentionally Excluded

These values are maintained inside the application and should not be provided in the CSV import file:

- `co_id`
- `invitation_token`
- `invitation_sent_at`
- `fnrole_id`
- `mgr_id`
- `created_at`
- `updated_at`

## Import Workflow Expectation

1. Sys admin creates the client organisation in `cos`.
2. Sys admin creates one or more org admins for that company.
3. Org admin logs in and imports or enters employee master data.
4. The application stamps every imported employee row with the org admin's `co_id` automatically.
5. Function-role assignment, manager mapping, and invitation sending happen after import.