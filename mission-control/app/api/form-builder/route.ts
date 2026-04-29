import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const DATA_PATH = path.join(WS, "data/forms.json");
const HTML_DIR = path.join(WS, "mission-control/public/forms");

interface Question {
  id: string;
  type: "text" | "multiple-choice" | "rating" | "yes-no" | "long-text";
  text: string;
  required: boolean;
  options?: string[];
}

interface FormResponse {
  id: string;
  answers: Record<string, string | number>;
  submittedAt: string;
  respondentEmail?: string;
}

interface Form {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  responses: FormResponse[];
  createdAt: string;
  status: "draft" | "active" | "closed";
}

function readForms(): Form[] {
  try {
    if (!fs.existsSync(DATA_PATH)) return [];
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeForms(forms: Form[]) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(forms, null, 2));
}

function generateHTML(form: Form): string {
  const questionsJSON = JSON.stringify(form.questions);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHTML(form.title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0f;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;justify-content:center;padding:2rem 1rem}
.container{max-width:640px;width:100%}
h1{font-size:1.75rem;font-weight:700;margin-bottom:.5rem}
.desc{color:#94a3b8;margin-bottom:2rem;line-height:1.6}
.question{background:#12121a;border:1px solid #1e1e2e;border-radius:12px;padding:1.25rem;margin-bottom:1.25rem}
.q-text{font-weight:600;margin-bottom:.75rem;line-height:1.4}
.required{color:#a855f7;margin-left:4px}
input[type="text"],textarea{width:100%;background:#0a0a0f;border:1px solid #1e1e2e;border-radius:8px;padding:.625rem .75rem;color:#e2e8f0;font-size:.9375rem;font-family:inherit}
input[type="text"]:focus,textarea:focus{outline:none;border-color:#a855f7}
textarea{resize:vertical;min-height:80px}
.rating-group{display:flex;gap:.5rem}
.rating-btn{width:40px;height:40px;border-radius:8px;border:1px solid #1e1e2e;background:#0a0a0f;color:#e2e8f0;font-weight:600;cursor:pointer;transition:all .15s}
.rating-btn:hover,.rating-btn.selected{background:#a855f7;border-color:#a855f7;color:#fff}
.radio-group{display:flex;flex-direction:column;gap:.5rem}
.radio-label{display:flex;align-items:center;gap:.5rem;cursor:pointer;padding:.5rem .75rem;border-radius:8px;border:1px solid #1e1e2e;transition:border-color .15s}
.radio-label:hover{border-color:#a855f7}
.radio-label input{accent-color:#a855f7}
.yesno-group{display:flex;gap:.75rem}
.yesno-btn{flex:1;padding:.625rem;border-radius:8px;border:1px solid #1e1e2e;background:#0a0a0f;color:#e2e8f0;font-weight:600;cursor:pointer;transition:all .15s;font-size:1rem}
.yesno-btn:hover,.yesno-btn.selected{background:#a855f7;border-color:#a855f7;color:#fff}
.submit-btn{width:100%;padding:.875rem;background:#a855f7;color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;transition:opacity .15s;margin-top:.5rem}
.submit-btn:hover{opacity:.85}
.submit-btn:disabled{opacity:.5;cursor:not-allowed}
.thank-you{text-align:center;padding:3rem 1rem}
.thank-you h2{font-size:1.5rem;margin-bottom:.75rem}
.thank-you p{color:#94a3b8}
.error-msg{color:#ef4444;font-size:.875rem;margin-top:.5rem}
</style>
</head>
<body>
<div class="container" id="form-container">
<h1>${escapeHTML(form.title)}</h1>
<p class="desc">${escapeHTML(form.description)}</p>
<form id="survey-form" onsubmit="return submitForm(event)">
<div id="questions"></div>
<button type="submit" class="submit-btn" id="submit-btn">Submit</button>
<div id="form-error" class="error-msg" style="display:none"></div>
</form>
</div>
<div class="container" id="thank-you" style="display:none">
<div class="thank-you">
<h2>Thank you!</h2>
<p>Your response has been recorded.</p>
</div>
</div>
<script>
const formId="${form.id}";
const questions=${questionsJSON};
const answers={};
function render(){
const el=document.getElementById("questions");
el.innerHTML=questions.map(q=>{
const req=q.required?'<span class="required">*</span>':"";
let input="";
if(q.type==="text") input='<input type="text" data-qid="'+q.id+'" oninput="answers[\\''+q.id+'\\']=this.value">';
else if(q.type==="long-text") input='<textarea data-qid="'+q.id+'" oninput="answers[\\''+q.id+'\\']=this.value"></textarea>';
else if(q.type==="rating") input='<div class="rating-group">'+[1,2,3,4,5].map(n=>'<button type="button" class="rating-btn" onclick="selectRating(\\''+q.id+"\\',"+n+',this)">'+n+"</button>").join("")+"</div>";
else if(q.type==="multiple-choice") input='<div class="radio-group">'+(q.options||[]).map((o,i)=>'<label class="radio-label"><input type="radio" name="q_'+q.id+'" value="'+escapeAttr(o)+'" onchange="answers[\\''+q.id+'\\']=\\''+escapeAttr(o)+'\\'"> '+escapeText(o)+"</label>").join("")+"</div>";
else if(q.type==="yes-no") input='<div class="yesno-group"><button type="button" class="yesno-btn" onclick="selectYN(\\''+q.id+"\\','Yes',this)\">Yes</button><button type=\\'button\\' class=\\'yesno-btn\\' onclick=\\'selectYN(\""+q.id+'","No",this)\\'>No</button></div>';
return '<div class="question"><div class="q-text">'+escapeText(q.text)+req+"</div>"+input+"</div>";
}).join("");
}
function selectRating(qid,val,btn){
answers[qid]=val;
btn.parentElement.querySelectorAll(".rating-btn").forEach(b=>b.classList.remove("selected"));
btn.classList.add("selected");
}
function selectYN(qid,val,btn){
answers[qid]=val;
btn.parentElement.querySelectorAll(".yesno-btn").forEach(b=>b.classList.remove("selected"));
btn.classList.add("selected");
}
function escapeText(s){const d=document.createElement("div");d.textContent=s;return d.innerHTML;}
function escapeAttr(s){return s.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
async function submitForm(e){
e.preventDefault();
const errEl=document.getElementById("form-error");
errEl.style.display="none";
for(const q of questions){
if(q.required&&(answers[q.id]===undefined||answers[q.id]==="")){
errEl.textContent="Please answer all required questions.";
errEl.style.display="block";
return false;
}
}
const btn=document.getElementById("submit-btn");
btn.disabled=true;btn.textContent="Submitting...";
try{
const res=await fetch("/api/form-builder",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit-response",formId,response:{answers}})});
if(!res.ok) throw new Error("Submit failed");
document.getElementById("form-container").style.display="none";
document.getElementById("thank-you").style.display="block";
}catch(err){
errEl.textContent="Something went wrong. Please try again.";
errEl.style.display="block";
btn.disabled=false;btn.textContent="Submit";
}
return false;
}
render();
</script>
</body>
</html>`;
}

function escapeHTML(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const responsesId = searchParams.get("responses");
  const forms = readForms();

  if (id) {
    const form = forms.find((f) => f.id === id);
    if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(form);
  }

  if (responsesId) {
    const form = forms.find((f) => f.id === responsesId);
    if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(form.responses);
  }

  return NextResponse.json(forms);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;
  const forms = readForms();

  if (action === "create-form") {
    const form: Form = {
      ...body.form,
      id: crypto.randomUUID(),
      responses: [],
      createdAt: new Date().toISOString(),
    };
    forms.push(form);
    writeForms(forms);
    if (form.status === "active") {
      fs.mkdirSync(HTML_DIR, { recursive: true });
      fs.writeFileSync(path.join(HTML_DIR, `${form.id}.html`), generateHTML(form));
    }
    return NextResponse.json(form);
  }

  if (action === "update-form") {
    const idx = forms.findIndex((f) => f.id === body.form.id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    forms[idx] = { ...forms[idx], ...body.form, responses: forms[idx].responses };
    writeForms(forms);
    if (forms[idx].status === "active") {
      fs.mkdirSync(HTML_DIR, { recursive: true });
      fs.writeFileSync(path.join(HTML_DIR, `${forms[idx].id}.html`), generateHTML(forms[idx]));
    }
    return NextResponse.json(forms[idx]);
  }

  if (action === "submit-response") {
    const idx = forms.findIndex((f) => f.id === body.formId);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const resp: FormResponse = {
      id: crypto.randomUUID(),
      answers: body.response.answers,
      submittedAt: new Date().toISOString(),
      respondentEmail: body.response.respondentEmail,
    };
    forms[idx].responses.push(resp);
    writeForms(forms);
    return NextResponse.json(resp);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const forms = readForms();
  const idx = forms.findIndex((f) => f.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const htmlPath = path.join(HTML_DIR, `${forms[idx].id}.html`);
  if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
  forms.splice(idx, 1);
  writeForms(forms);
  return NextResponse.json({ ok: true });
}
