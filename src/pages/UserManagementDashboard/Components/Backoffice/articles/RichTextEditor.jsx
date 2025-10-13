// src/pages/UserManagementDashboard/Components/Backoffice/articles/RichTextEditor.jsx
import React from "react";
import { Editor } from "@tinymce/tinymce-react";

const RichTextEditor = ({ value, onChange, height = 520, disabled = false }) => {
  return (
    <Editor
      /* CDN -> évite les erreurs Vite d'import */
      tinymceScriptSrc="https://cdn.jsdelivr.net/npm/tinymce@7.4.1/tinymce.min.js"
      value={value}
      onEditorChange={(content) => onChange?.(content)}
      disabled={disabled}
      init={{
        height,
        menubar: false,
        branding: false,
        promotion: false,
        language: "fr_FR",
        language_url:
          "https://cdn.jsdelivr.net/npm/tinymce@7.4.1/langs/fr_FR.js",

        /* ✅ Plugins utiles. NE RIEN IMPORTER depuis "tinymce/plugins/..." */
        plugins:
          "lists link image table media code codesample fullscreen quickbars paste",

        /* ✅ Toolbar demandée : alignement, barré, code, removeformat */
        toolbar:
          "undo redo | blocks | bold italic underline strikethrough | " +
          "forecolor backcolor removeformat | " +
          "alignleft aligncenter alignright alignjustify | " +
          "bullist numlist outdent indent | link table image media | code codesample fullscreen",

        /* Coller depuis Word / images encodées (simple et fiable) */
        paste_data_images: true,

        /* Style du contenu */
        content_style:
          'body{font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial;' +
          'font-size:14px;line-height:1.6;padding:0.5rem;} ' +
          "pre code{white-space:pre-wrap;} code{background:#f1f5f9;padding:.1rem .3rem;border-radius:.25rem;}",

        /* Upload d’image minimaliste (embed en base64). 
           Tu pourras plus tard brancher ton endpoint /api/uploads ici. */
        images_upload_handler: (blobInfo) =>
          Promise.resolve(
            `data:${blobInfo.blob().type};base64,${blobInfo.base64()}`
          ),
      }}
    />
  );
};

export default RichTextEditor;
