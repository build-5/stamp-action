import fs from "fs";
import FormData from "form-data";
import { BUILD5_URL, BUILD_5_TOKEN, OUTPUT_FILE } from "./config";
import { generateUID } from "./utils";

export const uploadFile = () =>
  new Promise<string>((res, rej) => {
    const file = fs.readFileSync(OUTPUT_FILE);

    const formData = new FormData();
    formData.append("file", file, OUTPUT_FILE);
    formData.append("member", generateUID());
    formData.append("uid", generateUID());
    formData.append("projectApiKey", BUILD_5_TOKEN);

    formData.submit(BUILD5_URL, (_, response) => {
      const chunks: any = [];

      response.on("data", (chunk) => {
        chunks.push(chunk);
      });

      response.on("end", () => {
        const responseBody = Buffer.concat(chunks).toString();
        res(JSON.parse(responseBody).data.url as string);
      });
    });
  });
