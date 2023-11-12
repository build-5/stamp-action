import * as core from "@actions/core";
const input = core.getInput("path", { required: true });
console.log("it works", input);
