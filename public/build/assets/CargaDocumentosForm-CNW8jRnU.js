import{r as l,j as e}from"./vendor-query-fzP4zlX8.js";const f=[{id:"documento_identidad",label:"Documento de Identidad",emoji:"🪪",required:!0},{id:"diploma_bachiller",label:"Diploma de Bachiller",emoji:"🎓",required:!0},{id:"certificados_estudio",label:"Certificados de Estudio",emoji:"📘",required:!0},{id:"certificados_laborales",label:"Certificados Laborales",emoji:"📄",required:!0},{id:"certificacion_eps",label:"Certificación EPS",emoji:"🧾",required:!0},{id:"certificacion_pension",label:"Certificación Fondo Pensiones",emoji:"🏥",required:!0},{id:"hoja_vida",label:"Formato Hoja de Vida S&M",emoji:"📝",required:!0},{id:"documentos_beneficiarios",label:"Documentos Beneficiarios",emoji:"👨‍👩‍👧‍👦",required:!1}],t=f.filter(i=>i.required).length,w=()=>e.jsx("style",{children:`
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
        .cdf-doc-card.cdf-card-done  { border-color: #27ae60; }
        .cdf-doc-card.cdf-card-error { border-color: #e74c3c; }

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
        .cdf-upload-zone:hover        { border-color: #1a9b8c; background: #f0faf8; }
        .cdf-upload-zone.zone-done    { border-color: #27ae60; background: #f0fdf4; border-style: solid; }
        .cdf-upload-zone.zone-loading { border-color: #1a9b8c; background: #f0faf8; cursor: default; }
        .cdf-upload-zone.zone-error   { border-color: #e74c3c; background: #fdf5f5; }

        .cdf-file-input {
            position: absolute; inset: 0;
            opacity: 0; cursor: pointer;
            width: 100%; height: 100%;
        }
        .cdf-file-input:disabled { cursor: default; }

        .cdf-up-text { font-size: 0.78rem; font-family: 'Nunito', sans-serif; font-weight: 700; color: #5a7a75; }
        .cdf-up-text.done  { color: #27ae60; }
        .cdf-up-text.error { color: #e74c3c; }

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
        .cdf-filename.err { color: #e74c3c; }

        .cdf-progress-wrap {
            background: #fff;
            border-radius: 14px;
            border: 1.5px solid #a8ddd7;
            padding: 20px 24px;
            box-shadow: 0 4px 16px rgba(26,155,140,0.06);
        }
        .cdf-prog-label {
            font-family: 'Poppins', sans-serif;
            font-weight: 700; font-size: 0.9rem;
            color: #1a3a35; margin-bottom: 10px;
        }
        .cdf-prog-bg   { height: 10px; background: #d0f0ec; border-radius: 99px; overflow: hidden; }
        .cdf-prog-fill {
            height: 100%; border-radius: 99px;
            background: linear-gradient(90deg, #1a9b8c, #22b8a7);
            transition: width 0.5s cubic-bezier(0.16,1,0.3,1);
        }
        .cdf-prog-note { margin-top: 7px; font-size: 0.8rem; color: #5a7a75; font-family: 'Nunito', sans-serif; }

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
            .cdf-progress-wrap { padding: 16px 18px !important; }
        }
    `}),N=()=>e.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"#5a7a75",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),e.jsx("polyline",{points:"17 8 12 3 7 8"}),e.jsx("line",{x1:"12",y1:"3",x2:"12",y2:"15"})]}),k=()=>e.jsx("svg",{width:"22",height:"22",viewBox:"0 0 24 24",fill:"none",stroke:"#27ae60",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round",children:e.jsx("polyline",{points:"20 6 9 17 4 12"})}),z=()=>e.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"#e74c3c",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("circle",{cx:"12",cy:"12",r:"10"}),e.jsx("line",{x1:"15",y1:"9",x2:"9",y2:"15"}),e.jsx("line",{x1:"9",y1:"9",x2:"15",y2:"15"})]});function E(){const[i,u]=l.useState(""),[p,x]=l.useState(""),[g,b]=l.useState(Object.fromEntries(f.map(o=>[o.id,{status:"idle",file:null,error:null}])));l.useEffect(()=>{const r=new URLSearchParams(window.location.search).get("doc");r&&u(r)},[]);const c=(o,r)=>b(a=>({...a,[o]:{...a[o],...r}})),j=async(o,r)=>{const a=r.target.files[0];if(!a)return;if(!i.trim()||!/^\d+$/.test(i.trim())){x("Por favor ingresa un número de documento válido (solo dígitos) antes de subir archivos."),r.target.value="";return}if(a.size>10*1024*1024){c(o,{status:"error",error:"El archivo supera los 10 MB permitidos."}),r.target.value="";return}x(""),c(o,{status:"loading",file:a.name,error:null});const d=new FormData;d.append("documento",i.trim()),d.append("tipo",o),d.append("archivo",a);const m=document.querySelector('meta[name="csrf-token"]')?.content;try{const n=await fetch("/api/documentos-contratacion/upload",{method:"POST",headers:{"X-CSRF-TOKEN":m??"",Accept:"application/json"},body:d});if(!n.ok){const v=await n.json().catch(()=>({}));throw new Error(v.message??`Error ${n.status}`)}c(o,{status:"done",file:a.name})}catch(n){c(o,{status:"error",error:n.message,file:a.name})}r.target.value=""},s=f.filter(o=>o.required&&g[o.id].status==="done").length,h=s===t,y=Math.round(s/t*100);return e.jsxs("div",{className:"cdf-page",children:[e.jsx(w,{}),e.jsxs("div",{className:"cdf-container",children:[e.jsxs("div",{className:"cdf-header",children:[e.jsx("div",{className:"cdf-logo-badge",children:"S&M"}),e.jsx("h1",{children:"CARGUE DE DOCUMENTOS"}),e.jsxs("p",{className:"cdf-header-sub",children:[e.jsx("span",{className:"cdf-dot"}),"Proceso de Contratación Activo"]})]}),e.jsxs("div",{className:"cdf-info-box",children:[e.jsx("div",{className:"cdf-info-icon",children:"i"}),e.jsxs("div",{children:["Sube cada documento en formato ",e.jsx("strong",{children:"PDF"})," (también se aceptan imágenes). Tamaño máximo ",e.jsx("strong",{children:"10 MB"})," por archivo. Los ",e.jsx("strong",{children:"7 documentos marcados como obligatorios"})," son requeridos para completar el proceso de contratación. Puedes subir los archivos de uno en uno; al seleccionar cada archivo se enviará automáticamente."]})]}),e.jsxs("div",{className:"cdf-doc-field",children:[e.jsx("label",{className:"cdf-doc-label",htmlFor:"cdf-docnum",children:"Número de Cédula / Documento de Identidad"}),e.jsx("input",{id:"cdf-docnum",type:"text",inputMode:"numeric",placeholder:"Ej: 1234567890",value:i,onChange:o=>{u(o.target.value),p&&x("")},className:"cdf-doc-input"}),p&&e.jsx("div",{className:"cdf-doc-err",children:p})]}),e.jsx("div",{className:"cdf-grid",children:f.map(o=>{const r=g[o.id],a=r.status==="done"?" zone-done":r.status==="loading"?" zone-loading":r.status==="error"?" zone-error":"",d=r.status==="done"?" cdf-card-done":r.status==="error"?" cdf-card-error":"";return e.jsxs("div",{className:`cdf-doc-card${d}`,children:[e.jsxs("div",{className:"cdf-card-top",children:[e.jsx("span",{className:"cdf-card-emoji",children:o.emoji}),e.jsxs("div",{className:"cdf-card-info",children:[e.jsx("div",{className:"cdf-card-label",children:o.label}),e.jsx("span",{className:`cdf-card-badge ${o.required?"cdf-badge-req":"cdf-badge-opt"}`,children:o.required?"OBLIGATORIO":"OPCIONAL"})]})]}),e.jsxs("label",{className:`cdf-upload-zone${a}`,htmlFor:`cdf-f-${o.id}`,children:[r.status==="idle"&&e.jsxs(e.Fragment,{children:[e.jsx(N,{}),e.jsx("span",{className:"cdf-up-text",children:"Seleccionar archivo"})]}),r.status==="loading"&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"cdf-spinner"}),e.jsx("span",{className:"cdf-up-text",children:"Subiendo..."})]}),r.status==="done"&&e.jsxs(e.Fragment,{children:[e.jsx(k,{}),e.jsx("span",{className:"cdf-filename",children:r.file}),e.jsx("span",{className:"cdf-up-text done",children:"Subido · clic para reemplazar"})]}),r.status==="error"&&e.jsxs(e.Fragment,{children:[e.jsx(z,{}),e.jsx("span",{className:"cdf-filename err",children:r.error}),e.jsx("span",{className:"cdf-up-text error",children:"Clic para reintentar"})]}),e.jsx("input",{id:`cdf-f-${o.id}`,type:"file",accept:"application/pdf,image/*",className:"cdf-file-input",onChange:m=>j(o.id,m),disabled:r.status==="loading"})]})]},o.id)})}),e.jsxs("div",{className:"cdf-progress-wrap",children:[e.jsxs("div",{className:"cdf-prog-label",children:["Progreso: ",s," de ",t," documentos obligatorios subidos"]}),e.jsx("div",{className:"cdf-prog-bg",children:e.jsx("div",{className:"cdf-prog-fill",style:{width:`${y}%`}})}),e.jsx("div",{className:"cdf-prog-note",children:h?"¡Todos los documentos obligatorios han sido enviados exitosamente!":`Faltan ${t-s} documento${t-s!==1?"s":""} por subir.`})]}),h&&e.jsxs("div",{className:"cdf-success-banner",children:[e.jsx("div",{className:"cdf-success-icon",children:"✓"}),e.jsxs("div",{children:[e.jsx("h3",{children:"¡Documentación completa!"}),e.jsx("p",{children:"Todos los documentos obligatorios han sido recibidos. El equipo de contratación revisará tu información y se pondrá en contacto contigo."})]})]})]})]})}export{E as default};
