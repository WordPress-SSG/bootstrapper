import * as fs from "fs";
import * as unzipper from "unzipper";
import archiver from "archiver";

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

    public async zipContents(domain: string): Promise<string> {
        const sourcePath = `${ContentService.CONTENTS_DIR}/wp-content-${domain}-unzipped`;
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = `${ContentService.CONTENTS_DIR}/wp-content-${domain}-backup-${timestamp}`;
        const zipPath = `${ContentService.CONTENTS_DIR}/wp-content-${domain}.zip`;

        if (!fs.existsSync(sourcePath)) {
            throw new Error(`Source directory not found: ${sourcePath}`);
        }

        // Create a backup of the directory before zipping
        fs.cpSync(sourcePath, backupPath, { recursive: true });
        console.log(`Backup created at: ${backupPath}`);

        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 1 } });

        return new Promise((resolve, reject) => {
            output.on("close", () => {
                console.log(`Contents zipped successfully to: ${zipPath}`);

                // Remove the original unzipped contents after successful zipping
                fs.rmSync(sourcePath, { recursive: true, force: true });
                console.log(`Source directory removed: ${sourcePath}`);

                resolve(zipPath);
            });
            archive.on("error", (err) => reject(err));
            archive.pipe(output);
            archive.directory(sourcePath, false);
            archive.finalize();
        });
    }
}
