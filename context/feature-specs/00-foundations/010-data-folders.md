# 010: App Name, Data Folders and Log File

Keeps development and the real app apart, and writes a rotating log file, so a test can never open the client's books (risk D4).

**Client sees:** nothing. Internal.

## Depends On

- 009

## Implementation

1. The packaged app uses the product name. `npm run dev` uses the product name plus ` Dev`, so the two never share a data folder or instance lock.
2. Closing the window quits the app (client question 17).
3. The logger writes to a rotating log file in the data folder, at most 5 MB, 3 old files kept. Ids and counts only.

## Check When Done

- The `npm run dev` data folder ends in ` Dev`, and holds the log file.
- A log line contains no amount, name or description (checked by reading the file).
- `npm run check` passes.
