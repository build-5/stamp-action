import archiver from "archiver";
import fs from "fs";
import ignore, { Ignore } from "ignore";
import path from "path";
import { OUTPUT_FILE } from "./config";

const archive = archiver("zip", { zlib: { level: 9 } });

const getIgnore = (dir: string, ig: Ignore | undefined): Ignore => {
  const gitignorePath = path.join(dir, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath).toString();
    return (ig || ignore()).add(gitignoreContent);
  }
  return ig || ignore();
};

const addToArchive = (dir: string, prevIg: Ignore | undefined) => {
  const ig = getIgnore(dir, prevIg);
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (ig.ignores(fullPath) || fullPath.includes(".git")) {
      return;
    }
    if (fs.statSync(fullPath).isDirectory()) {
      addToArchive(fullPath, ig);
    } else {
      archive.file(fullPath, { name: fullPath });
    }
  });
};

export const zipProject = (path: string) =>
  new Promise<void>((res) => {
    console.log('Zipping files in ', path)
    fs.rmSync(OUTPUT_FILE, { force: true });
    const output = fs.createWriteStream(OUTPUT_FILE);
    archive.pipe(output);
    addToArchive(path, undefined);
    archive.finalize();
    output.on("close", function () {
      const mb = archive.pointer() / 1024 / 1024;
      console.log(`Zip file created: ${OUTPUT_FILE} (${mb} total mb)`);
      fs.chmodSync(OUTPUT_FILE, 777);
      res();
    });
  });
