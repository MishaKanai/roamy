export type Success = {
    _type: 'success'
    date: Date
}
export type SyncingState = {
    _type: 'initial'
} | Success | {
    _type: 'failure',
    date: Date
    error: DropboxResponseError<unknown>
} | {
    _type: 'request_pending',
} | {
    _type: 'debounced_pending',
}
