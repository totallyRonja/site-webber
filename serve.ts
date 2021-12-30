import * as path from "https://deno.land/std@0.119.0/path/mod.ts";
import { readableStreamFromReader } from "https://deno.land/std@0.119.0/streams/mod.ts";

export async function serve(dir: string) {
    const server = Deno.listen({ port: 8080 });
    console.log("File server running on http://localhost:8080/");

    for await (const conn of server) {
    handleHttp(conn);
    }

    async function handleHttp(conn: Deno.Conn) {
    const httpConn = Deno.serveHttp(conn);
    for await (const requestEvent of httpConn) {
        // Use the request pathname as filepath
        const url = new URL(requestEvent.request.url);
        const urlPath = decodeURIComponent(url.pathname);

        // Try opening the file
        let file;
        let filePath = path.join(dir, urlPath);
        try {
            const stat = await Deno.stat(filePath);
            if(stat.isFile){
                file = await Deno.open(filePath, { read: true });
            } else if (stat.isDirectory) {
                filePath = path.join(filePath, "index.html");
                file = await Deno.open(filePath, { read: true });
            } else {
                throw "Can't find (probably symlink).";
            }
        } catch (reason){
            console.log(`couldn't serve file because "${reason}" ¯\\_(ツ)_/¯`);
            // If the file cannot be opened, return a "404 Not Found" response
            const notFoundResponse = new Response("404 Not Found", { status: 404 });
            try{
                await requestEvent.respondWith(notFoundResponse);
            } catch {/**/}
            return;
        }

        // Build a readable stream so the file doesn't have to be fully loaded into
        // memory while we send it
        const readableStream = readableStreamFromReader(file);

        let contentType = "text/plain";
        const ext = path.extname(filePath);
        switch (ext) {
            case ".html": contentType = "text/html";
            break;
            case ".js": contentType = "text/javascript";
            break;
        }

        // Build and send the response
        const response = new Response(readableStream, {headers: {"Content-Type": contentType}});
        await requestEvent.respondWith(response);
    }
    }
}