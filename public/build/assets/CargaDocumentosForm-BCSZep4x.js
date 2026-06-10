import{r as u,j as e}from"./vendor-query-fzP4zlX8.js";const D="https://251096727969e82c98eb7eaa0a0fc8.e6.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/4bb66ac2b8b24182ac8839ce4c0d2e71/triggers/manual/paths/invoke/?api-version=1&tenantId=tId&environmentName=25109672-7969-e82c-98eb-7eaa0a0fc8e6&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=i1FhI0V6l809I8aDprH8YGBMAPwRdWfDsp_NiuW8KXo",f={width:28,height:28,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round"},S=()=>e.jsxs("svg",{...f,children:[e.jsx("rect",{x:"2",y:"5",width:"20",height:"14",rx:"2"}),e.jsx("circle",{cx:"8",cy:"12",r:"2"}),e.jsx("path",{d:"M14 9h4M14 12h4M14 15h2"})]}),L=()=>e.jsxs("svg",{...f,children:[e.jsx("circle",{cx:"12",cy:"8",r:"6"}),e.jsx("path",{d:"M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"})]}),F=()=>e.jsxs("svg",{...f,children:[e.jsx("path",{d:"M4 19.5A2.5 2.5 0 0 1 6.5 17H20"}),e.jsx("path",{d:"M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"})]}),_=()=>e.jsxs("svg",{...f,children:[e.jsx("rect",{x:"2",y:"7",width:"20",height:"14",rx:"2",ry:"2"}),e.jsx("path",{d:"M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"}),e.jsx("line",{x1:"12",y1:"12",x2:"12",y2:"16"}),e.jsx("line",{x1:"10",y1:"14",x2:"14",y2:"14"})]}),M=()=>e.jsx("svg",{...f,children:e.jsx("path",{d:"M22 12h-4l-3 9L9 3l-3 9H2"})}),P=()=>e.jsxs("svg",{...f,children:[e.jsx("line",{x1:"12",y1:"1",x2:"12",y2:"23"}),e.jsx("path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"})]}),A=()=>e.jsxs("svg",{...f,children:[e.jsx("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),e.jsx("polyline",{points:"14 2 14 8 20 8"}),e.jsx("line",{x1:"16",y1:"13",x2:"8",y2:"13"}),e.jsx("line",{x1:"16",y1:"17",x2:"8",y2:"17"})]}),R=()=>e.jsxs("svg",{...f,children:[e.jsx("path",{d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}),e.jsx("circle",{cx:"9",cy:"7",r:"4"}),e.jsx("path",{d:"M23 21v-2a4 4 0 0 0-3-3.87"}),e.jsx("path",{d:"M16 3.13a4 4 0 0 1 0 7.75"})]}),l=[{id:"documento_identidad",label:"Documento de Identidad",tipo:"DOCUMENTO_DE_IDENTIDAD",Icon:S,required:!0},{id:"diploma_bachiller",label:"Diploma de Bachiller",tipo:"DIPLOMA_DE_BACHILLER",Icon:L,required:!0},{id:"certificados_estudio",label:"Certificados de Estudio",tipo:"CERTIFICADOS_DE_ESTUDIO",Icon:F,required:!0},{id:"certificados_laborales",label:"Certificados Laborales",tipo:"CERTIFICADOS_LABORALES",Icon:_,required:!0},{id:"certificacion_eps",label:"Certificación EPS",tipo:"CERTIFICADO_EPS",Icon:M,required:!0},{id:"certificacion_pension",label:"Certificación Fondo Pensiones",tipo:"CERTIFICADO_FONDO_PENSIONES",Icon:P,required:!0},{id:"hoja_vida",label:"Formato Hoja de Vida S&M",tipo:"HOJA_DE_VIDA",Icon:A,required:!0},{id:"documentos_beneficiarios",label:"Documentos Beneficiarios",tipo:"DOCUMENTOS_BENEFICIARIOS",Icon:R,required:!1}],q=l.filter(a=>a.required).length,T=a=>new Promise((m,h)=>{const d=new FileReader;d.onload=()=>m(d.result.split(",")[1]),d.onerror=h,d.readAsDataURL(a)}),B=()=>e.jsx("style",{children:`
        @keyframes cdf-fadeUp {
            from { opacity: 0; transform: translateY(18px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cdf-spin   { to { transform: rotate(360deg); } }
        @keyframes cdf-pulse  { 0%,100% { opacity:1; } 50% { opacity:0.5; } }

        .cdf-page {
            min-height: 100vh;
            background: linear-gradient(160deg, #c8eeea 0%, #e8f7f5 60%, #d4ede9 100%);
            padding: 32px 16px 64px;
            font-family: 'Nunito', sans-serif;
            box-sizing: border-box;
        }
        .cdf-container {
            max-width: 840px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 22px;
            animation: cdf-fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both;
        }

        .cdf-header {
            background: linear-gradient(135deg, #186059 0%, #1a9b8c 60%, #22b8a7 100%);
            border-radius: 20px;
            padding: 32px 36px;
            color: #fff;
            box-shadow: 0 8px 32px rgba(24,96,89,0.28);
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 10px;
        }
        .cdf-logo-badge {
            width: 56px; height: 56px;
            border-radius: 14px;
            background: rgba(255,255,255,0.2);
            border: 2px solid rgba(255,255,255,0.5);
            display: flex; align-items: center; justify-content: center;
            font-family: 'Poppins', sans-serif;
            font-weight: 900; font-size: 1.1rem;
            color: #fff;
            letter-spacing: 0.02em;
        }
        .cdf-header h1 {
            font-family: 'Poppins', sans-serif;
            font-weight: 900; font-size: 1.5rem;
            letter-spacing: 0.05em; margin: 0;
        }
        .cdf-header-sub {
            font-size: 0.92rem; opacity: 0.9; margin: 0;
            display: flex; align-items: center; gap: 8px;
        }
        .cdf-dot {
            width: 8px; height: 8px;
            border-radius: 50%; background: #f9c623;
            display: inline-block;
            animation: cdf-pulse 1.8s ease-in-out infinite;
        }

        .cdf-info-box {
            background: rgba(255,255,255,0.92);
            border-radius: 14px;
            border: 1.5px solid #a8ddd7;
            padding: 16px 20px;
            display: flex; gap: 14px;
            align-items: flex-start;
            font-size: 0.88rem;
            color: #1a3a35;
            line-height: 1.65;
            box-shadow: 0 2px 12px rgba(26,155,140,0.06);
        }
        .cdf-info-icon {
            flex-shrink: 0;
            width: 32px; height: 32px;
            border-radius: 50%;
            background: #d0f0ec;
            display: flex; align-items: center; justify-content: center;
            font-size: 1rem; color: #127a6d; font-weight: 800;
        }

        .cdf-doc-field {
            background: #fff;
            border-radius: 14px;
            border: 1.5px solid #a8ddd7;
            padding: 22px 24px;
            box-shadow: 0 4px 16px rgba(26,155,140,0.08);
        }
        .cdf-doc-label {
            font-family: 'Poppins', sans-serif;
            font-weight: 800; font-size: 0.8rem;
            text-transform: uppercase; letter-spacing: 0.06em;
            color: #1a9b8c; margin-bottom: 8px;
            display: block;
        }
        .cdf-doc-input {
            width: 100%; padding: 12px 16px;
            border: 1.5px solid #a8ddd7;
            border-radius: 10px;
            font-size: 1.1rem;
            font-family: 'Nunito', sans-serif;
            font-weight: 700; color: #1a3a35;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
            box-sizing: border-box;
            letter-spacing: 0.06em;
        }
        .cdf-doc-input:focus {
            border-color: #1a9b8c;
            box-shadow: 0 0 0 4px rgba(26,155,140,0.14);
        }
        .cdf-doc-err {
            color: #c0392b; font-size: 0.8rem;
            margin-top: 6px; font-weight: 700;
            font-family: 'Nunito', sans-serif;
        }

        .cdf-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        .cdf-doc-card {
            background: #fff;
            border-radius: 14px;
            border: 1.5px solid #a8ddd7;
            box-shadow: 0 4px 16px rgba(26,155,140,0.06);
            overflow: hidden;
            transition: transform 0.18s, box-shadow 0.18s;
        }
        .cdf-doc-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(26,155,140,0.14); }
        .cdf-doc-card.cdf-card-done     { border-color: #27ae60; }
        .cdf-doc-card.cdf-card-selected { border-color: #1a9b8c; }
        .cdf-doc-card.cdf-card-error    { border-color: #e74c3c; }

        .cdf-card-top {
            padding: 16px 18px 10px;
            display: flex; align-items: flex-start; gap: 12px;
        }
        .cdf-card-emoji { font-size: 1.6rem; line-height: 1; flex-shrink: 0; }
        .cdf-card-info  { flex: 1; }
        .cdf-card-label {
            font-family: 'Poppins', sans-serif;
            font-weight: 700; font-size: 0.88rem;
            color: #1a3a35; line-height: 1.3;
        }
        .cdf-card-badge {
            display: inline-block;
            font-size: 0.68rem; font-weight: 800;
            font-family: 'Poppins', sans-serif;
            letter-spacing: 0.04em;
            padding: 2px 8px; border-radius: 20px;
            margin-top: 5px;
        }
        .cdf-badge-req  { background: #fdf0d5; color: #d67e00; }
        .cdf-badge-opt  { background: #e8f7f5; color: #127a6d; }

        .cdf-upload-zone {
            margin: 0 14px 14px;
            border: 2px dashed #a8ddd7;
            border-radius: 10px;
            padding: 14px 12px;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            gap: 5px; cursor: pointer;
            transition: border-color 0.2s, background 0.2s;
            min-height: 76px; text-align: center;
            position: relative;
        }
        .cdf-upload-zone:hover           { border-color: #1a9b8c; background: #f0faf8; }
        .cdf-upload-zone.zone-done       { border-color: #27ae60; background: #f0fdf4; border-style: solid; }
        .cdf-upload-zone.zone-selected   { border-color: #1a9b8c; background: #eaf8f6; border-style: solid; }
        .cdf-upload-zone.zone-loading    { border-color: #1a9b8c; background: #f0faf8; cursor: default; }
        .cdf-upload-zone.zone-error      { border-color: #e74c3c; background: #fdf5f5; }

        .cdf-file-input {
            position: absolute; inset: 0;
            opacity: 0; cursor: pointer;
            width: 100%; height: 100%;
        }
        .cdf-file-input:disabled { cursor: default; }

        .cdf-up-text          { font-size: 0.78rem; font-family: 'Nunito', sans-serif; font-weight: 700; color: #5a7a75; }
        .cdf-up-text.done     { color: #27ae60; }
        .cdf-up-text.selected { color: #1a9b8c; }
        .cdf-up-text.error    { color: #e74c3c; }

        .cdf-spinner {
            width: 20px; height: 20px;
            border: 3px solid rgba(26,155,140,0.2);
            border-top-color: #1a9b8c;
            border-radius: 50%;
            animation: cdf-spin 0.7s linear infinite;
        }
        .cdf-filename {
            font-size: 0.72rem; font-family: 'Nunito', sans-serif;
            color: #27ae60; font-weight: 600;
            max-width: 160px; overflow: hidden;
            text-overflow: ellipsis; white-space: nowrap;
        }
        .cdf-filename.sel { color: #127a6d; }
        .cdf-filename.err { color: #e74c3c; }

        /* Submit button */
        .cdf-submit-wrap {
            background: #fff;
            border-radius: 14px;
            border: 1.5px solid #a8ddd7;
            padding: 24px 28px;
            box-shadow: 0 4px 16px rgba(26,155,140,0.06);
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .cdf-submit-note {
            font-size: 0.88rem;
            color: #127a6d;
            font-family: 'Nunito', sans-serif;
            font-weight: 700;
            text-align: center;
            margin: 0;
        }
        .cdf-submit-missing {
            font-size: 0.82rem;
            color: #8aaba6;
            font-family: 'Nunito', sans-serif;
            text-align: center;
            margin: 0;
        }
        .cdf-submit-btn {
            width: 100%;
            padding: 16px 24px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(135deg, #186059, #1a9b8c);
            color: #fff;
            font-family: 'Poppins', sans-serif;
            font-weight: 700;
            font-size: 1rem;
            letter-spacing: 0.03em;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 4px 16px rgba(24,96,89,0.28);
            transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .cdf-submit-btn:hover:not(:disabled) {
            opacity: 0.92;
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(24,96,89,0.36);
        }
        .cdf-submit-btn:disabled {
            background: #c8d8d6;
            box-shadow: none;
            cursor: not-allowed;
            color: #8aaba6;
        }
        .cdf-spinner-white {
            border-color: rgba(255,255,255,0.3);
            border-top-color: #fff;
        }

        .cdf-success-banner {
            background: linear-gradient(135deg, #27ae60, #1e8449);
            border-radius: 14px;
            padding: 24px 28px;
            color: #fff;
            display: flex; align-items: center; gap: 18px;
            box-shadow: 0 8px 24px rgba(39,174,96,0.25);
            animation: cdf-fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
        }
        .cdf-success-icon {
            width: 52px; height: 52px;
            border-radius: 50%;
            background: rgba(255,255,255,0.2);
            display: flex; align-items: center; justify-content: center;
            font-size: 1.6rem; flex-shrink: 0;
        }
        .cdf-success-banner h3 {
            font-family: 'Poppins', sans-serif;
            font-weight: 800; font-size: 1.05rem;
            margin: 0 0 4px;
        }
        .cdf-success-banner p { font-size: 0.88rem; opacity: 0.92; margin: 0; }

        @media (max-width: 600px) {
            .cdf-grid          { grid-template-columns: 1fr !important; }
            .cdf-header        { padding: 24px 20px !important; }
            .cdf-header h1     { font-size: 1.15rem !important; }
            .cdf-doc-field     { padding: 18px 16px !important; }
            .cdf-submit-wrap   { padding: 18px 16px !important; }
        }
    `}),U=()=>e.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"#5a7a75",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),e.jsx("polyline",{points:"17 8 12 3 7 8"}),e.jsx("line",{x1:"12",y1:"3",x2:"12",y2:"15"})]}),$=()=>e.jsx("svg",{width:"22",height:"22",viewBox:"0 0 24 24",fill:"none",stroke:"#27ae60",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:e.jsx("polyline",{points:"20 6 9 17 4 12"})}),H=()=>e.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"#1a9b8c",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),e.jsx("polyline",{points:"14 2 14 8 20 8"})]}),W=()=>e.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"#e74c3c",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("circle",{cx:"12",cy:"12",r:"10"}),e.jsx("line",{x1:"15",y1:"9",x2:"9",y2:"15"}),e.jsx("line",{x1:"9",y1:"9",x2:"15",y2:"15"})]}),V=()=>e.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("line",{x1:"22",y1:"2",x2:"11",y2:"13"}),e.jsx("polygon",{points:"22 2 15 22 11 13 2 9 22 2"})]});function X(){const[a,m]=u.useState(""),[h,d]=u.useState(""),[w,E]=u.useState({nombre:"",correo:""}),[g,k]=u.useState(!1),[p,N]=u.useState(Object.fromEntries(l.map(o=>[o.id,{status:"idle",name:null,fileObj:null,error:null}])));u.useEffect(()=>{const o=new URLSearchParams(window.location.search),s=o.get("token"),i=o.get("doc");s?fetch(`/api/carga-documentos/resolve-token?token=${encodeURIComponent(s)}`).then(r=>r.ok?r.json():null).then(r=>{r?.documento&&(m(r.documento),E({nombre:r.nombre??"",correo:r.correo??""}))}).catch(()=>{}):i&&m(i)},[]);const b=(o,s)=>N(i=>({...i,[o]:{...i[o],...s}})),C=(o,s)=>{const i=s.target.files[0];if(!i)return;if(!a.trim()||!/^\d+$/.test(a.trim())){d("Por favor ingresa un número de documento válido (solo dígitos) antes de seleccionar archivos."),s.target.value="";return}if(i.size>10*1024*1024){b(o,{status:"error",error:"El archivo supera los 10 MB permitidos.",fileObj:null,name:null}),s.target.value="";return}const r=l.find(y=>y.id===o),n=i.name.split(".").pop().toLowerCase(),c=`${a.trim()}_${r.tipo}.${n}`;d(""),b(o,{status:"selected",name:c,fileObj:i,error:null}),s.target.value=""},z=async()=>{const o=l.filter(r=>p[r.id].status==="selected").map(r=>({doc:r,file:p[r.id].fileObj}));if(!o.length||g)return;k(!0),N(r=>{const n={...r};return o.forEach(({doc:c})=>{n[c.id]={...n[c.id],status:"uploading"}}),n});const s=document.querySelector('meta[name="csrf-token"]')?.content??"",i=[];for(const{doc:r,file:n}of o){const c=n.name.split(".").pop().toLowerCase(),y=`${a.trim()}_${r.tipo}.${c}`;try{const x=new FormData;x.append("documento",a.trim()),x.append("tipo",r.id),x.append("archivo",n);const v=await fetch("/api/documentos-contratacion/upload",{method:"POST",headers:{"X-CSRF-TOKEN":s},body:x});if(!v.ok){const O=await v.json().catch(()=>({}));throw new Error(O.message??`Error ${v.status}`)}b(r.id,{status:"done",name:y,fileObj:null}),i.push({filename:y,file:n})}catch(x){b(r.id,{status:"error",error:x.message,fileObj:null})}}i.length>0&&Promise.all(i.map(({filename:r,file:n})=>T(n).then(c=>({filename:r,fileContent:c})))).then(r=>fetch(D,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nombre:w.nombre,cedula:a.trim(),correo:w.correo,captchaToken:"",archivos:r})})).catch(()=>{}),k(!1)},t=l.filter(o=>p[o.id].status==="selected").length,I=l.filter(o=>o.required&&p[o.id].status==="done").length===q,j=l.filter(o=>o.required&&!["selected","done"].includes(p[o.id].status)).length;return e.jsxs("div",{className:"cdf-page",children:[e.jsx(B,{}),e.jsxs("div",{className:"cdf-container",children:[e.jsxs("div",{className:"cdf-header",children:[e.jsx("div",{className:"cdf-logo-badge",children:"S&M"}),e.jsx("h1",{children:"CARGUE DE DOCUMENTOS"}),e.jsxs("p",{className:"cdf-header-sub",children:[e.jsx("span",{className:"cdf-dot"}),"Proceso de Contratación Activo"]})]}),e.jsxs("div",{className:"cdf-info-box",children:[e.jsx("div",{className:"cdf-info-icon",children:"i"}),e.jsxs("div",{children:["Sube cada documento en formato ",e.jsx("strong",{children:"PDF"})," (también se aceptan imágenes). Tamaño máximo ",e.jsx("strong",{children:"10 MB"})," por archivo. Los ",e.jsx("strong",{children:"7 documentos marcados como obligatorios"})," son requeridos para completar el proceso de contratación. Selecciona todos los archivos y luego presiona ",e.jsx("strong",{children:"Enviar documentos"}),"."]})]}),e.jsxs("div",{className:"cdf-doc-field",children:[e.jsx("label",{className:"cdf-doc-label",htmlFor:"cdf-docnum",children:"Número de Cédula / Documento de Identidad"}),e.jsx("input",{id:"cdf-docnum",type:"text",inputMode:"numeric",placeholder:"Ej: 1234567890",value:a,onChange:o=>{m(o.target.value),h&&d("")},className:"cdf-doc-input",disabled:g}),h&&e.jsx("div",{className:"cdf-doc-err",children:h})]}),e.jsx("div",{className:"cdf-grid",children:l.map(o=>{const s=p[o.id],i=s.status==="done"?" zone-done":s.status==="selected"?" zone-selected":s.status==="uploading"?" zone-loading":s.status==="error"?" zone-error":"",r=s.status==="done"?" cdf-card-done":s.status==="selected"?" cdf-card-selected":s.status==="error"?" cdf-card-error":"";return e.jsxs("div",{className:`cdf-doc-card${r}`,children:[e.jsxs("div",{className:"cdf-card-top",children:[e.jsx("span",{className:"cdf-card-emoji",children:e.jsx(o.Icon,{})}),e.jsxs("div",{className:"cdf-card-info",children:[e.jsx("div",{className:"cdf-card-label",children:o.label}),e.jsx("span",{className:`cdf-card-badge ${o.required?"cdf-badge-req":"cdf-badge-opt"}`,children:o.required?"OBLIGATORIO":"OPCIONAL"})]})]}),e.jsxs("label",{className:`cdf-upload-zone${i}`,htmlFor:`cdf-f-${o.id}`,children:[s.status==="idle"&&e.jsxs(e.Fragment,{children:[e.jsx(U,{}),e.jsx("span",{className:"cdf-up-text",children:"Seleccionar archivo"})]}),s.status==="selected"&&e.jsxs(e.Fragment,{children:[e.jsx(H,{}),e.jsx("span",{className:"cdf-filename sel",children:s.name}),e.jsx("span",{className:"cdf-up-text selected",children:"Listo · clic para cambiar"})]}),s.status==="uploading"&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"cdf-spinner"}),e.jsx("span",{className:"cdf-up-text",children:"Enviando..."})]}),s.status==="done"&&e.jsxs(e.Fragment,{children:[e.jsx($,{}),e.jsx("span",{className:"cdf-filename",children:s.name}),e.jsx("span",{className:"cdf-up-text done",children:"Subido · clic para reemplazar"})]}),s.status==="error"&&e.jsxs(e.Fragment,{children:[e.jsx(W,{}),e.jsx("span",{className:"cdf-filename err",children:s.error}),e.jsx("span",{className:"cdf-up-text error",children:"Clic para reintentar"})]}),e.jsx("input",{id:`cdf-f-${o.id}`,type:"file",accept:"application/pdf,image/*",className:"cdf-file-input",onChange:n=>C(o.id,n),disabled:s.status==="uploading"||g})]})]},o.id)})}),!I&&e.jsxs("div",{className:"cdf-submit-wrap",children:[t>0&&e.jsxs("p",{className:"cdf-submit-note",children:[t," archivo",t!==1?"s":""," seleccionado",t!==1?"s":""," y listo",t!==1?"s":""," para enviar"]}),j>0&&e.jsxs("p",{className:"cdf-submit-missing",children:["Faltan ",j," documento",j!==1?"s":""," obligatorio",j!==1?"s":""," por seleccionar"]}),e.jsx("button",{className:"cdf-submit-btn",onClick:z,disabled:t===0||g,children:g?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"cdf-spinner cdf-spinner-white"}),"Enviando documentos..."]}):e.jsxs(e.Fragment,{children:[e.jsx(V,{}),t>0?`Enviar ${t} documento${t!==1?"s":""}`:"Enviar documentos"]})})]}),I&&e.jsxs("div",{className:"cdf-success-banner",children:[e.jsx("div",{className:"cdf-success-icon",children:e.jsx("svg",{width:"36",height:"36",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:e.jsx("polyline",{points:"20 6 9 17 4 12"})})}),e.jsxs("div",{children:[e.jsx("h3",{children:"¡Documentación completa!"}),e.jsx("p",{children:"Todos los documentos obligatorios han sido recibidos. El equipo de contratación revisará tu información y se pondrá en contacto contigo."})]})]})]})]})}export{X as default};
