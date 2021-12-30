import { parse } from "https://deno.land/std@0.119.0/flags/mod.ts";
import * as path from "https://deno.land/std@0.97.0/path/mod.ts";
import {ensureDir} from "https://deno.land/std@0.119.0/fs/mod.ts";
import * as Colors from "https://deno.land/std@0.119.0/fmt/colors.ts";

import { serve } from "./serve.ts";

const startTime = Date.now();

const args = parse(Deno.args);
//todo: check args validity
const inputDir: string = args["dir"] ?? Deno.cwd();
const outputDir: string = args["out"] ?? path.join(inputDir, "_site");

await ensureDir(outputDir);

for await(const entry of Deno.readDir(inputDir)){
	if(entry.isFile){
		const entryPath = path.join(inputDir, entry.name);
		const ext = path.extname(entryPath);
		switch(ext){
			case ".html": {	
				await Deno.copyFile(entryPath, path.join(outputDir, entry.name));
			}
			break;
			case ".ts": {
				//todo: bundle?
				const rel = path.relative(Deno.cwd(), entryPath);
				const compiled = await Deno.emit(rel);
				for(let [file, source] of Object.entries(compiled.files)){
					if(!file.startsWith("file:///")) continue;
					file = file.substring("file:///".length);
					let filePath = path.relative(inputDir, file);
					filePath = path.join(outputDir, filePath);
					Deno.writeTextFile(filePath, source, { create: true });
				}
			} 
			break;
			default: continue;
		}
		
		console.log(`${Colors.green("Webbed")} '${entryPath}'.`);
	}
}

const endTime = Date.now();
const runDuration = endTime - startTime;
console.log(Colors.green(`Webbed site in ${runDuration}ms!`));

if(args["serve"]){
	serve(outputDir);
}