import * as fs from "fs";
import * as unzipper from "unzipper";

export class ContentService {
    private static readonly CONTENTS_DIR = "/tmp/contents";

    public async unzipContents(domain: string): Promise<string> {
        const zipPath = `${ContentService.CONTENTS_DIR}/wp-content-${domain}.zip`;
        const extractPath = `${ContentService.CONTENTS_DIR}/wp-content-${domain}-unzipped`;

        if (!fs.existsSync(zipPath)) {
            throw new Error(`Content ZIP file not found: ${zipPath}`);
        }

        // Delete folder if it exists
        if (fs.existsSync(extractPath)) {
            fs.rmSync(extractPath, { recursive: true, force: true });
        }

        await fs.createReadStream(zipPath)
            .pipe(unzipper.Extract({ path: extractPath }))
            .promise();

        console.log(`Contents extracted successfully to: ${extractPath}`);
        return extractPath;
    }
}
