import { Dropbox } from "dropbox";

async function loadFileJSON<T>(dbx: Dropbox, filePath: string, rev?: string): Promise<{
    data: T,
    rev: string
}> {
    const data = await dbx.filesDownload({ path: filePath, rev });
    const fileBlob = (data.result as any)?.fileBlob;
    if (!fileBlob) {
        throw new Error('No fileBlob');
    }
    return new Promise((resolve, reject) => {
        var fr = new FileReader();
        fr.onload = function (e) {
            // e.target.result should contain the text
            const res = e.target?.result as string;
            if (res) {
                const index: T = JSON.parse(res);
                resolve({
                    data: index,
                    rev: data.result.rev
                });
            }
        };
        fr.readAsText(fileBlob);
        fr.onerror = function (e) {
            reject(e);
        }
    });
}

export default loadFileJSON;