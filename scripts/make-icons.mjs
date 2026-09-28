import sharp from "sharp"; import fs from "fs";
let svg = fs.readFileSync("public/mr-mark.svg","utf8").replace(/currentColor/g,"#FFFFFF").replace(/fill="#0A0A0A"|fill="#000000"|fill="#000"/gi,'fill="#FFFFFF"');
async function make(size, pad, out){
  const inner = Math.round(size*(1-2*pad));
  const mark = await sharp(Buffer.from(svg),{density:600}).resize(inner,inner,{fit:"contain",background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  await sharp({create:{width:size,height:size,channels:4,background:"#0A0A0A"}}).composite([{input:mark,gravity:"center"}]).png().toFile(out);
}
await make(192,0.12,"public/icons/icon-192.png");
await make(512,0.12,"public/icons/icon-512.png");
await make(512,0.2,"public/icons/icon-512-maskable.png");
await make(180,0.12,"public/apple-touch-icon.png");
