"use client";

import { useId, useRef, useState } from "react";

// Zone d'import d'image : glisser-deposer, clic pour choisir un fichier, ou
// collage depuis le presse-papier quand la zone a le focus.
export default function AdminImageDropzone({
  label,
  currentUrl,
  busy = false,
  disabled = false,
  compact = false,
  onFile,
}: {
  label: string;
  currentUrl?: string | null;
  busy?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onFile: (file: File) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const locked = busy || disabled;

  function handleFiles(files: FileList | null | undefined) {
    const file = files?.[0];
    if (!file || locked) return;

    // Un glisser-deposer depuis le bureau peut apporter autre chose qu'une image.
    if (!file.type.startsWith("image/")) return;

    onFile(file);
  }

  return (
    <div
      // Le drop natif du navigateur ouvre le fichier dans l'onglet : il faut
      // neutraliser dragover pour que la zone recoive l'evenement.
      onDragOver={(event) => {
        if (locked) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handleFiles(event.dataTransfer?.files);
      }}
      onPaste={(event) => handleFiles(event.clipboardData?.files)}
      className={`rounded-lg border border-dashed text-center transition ${
        compact ? "p-2" : "p-3"
      } ${
        dragging
          ? "border-violet-400 bg-violet-500/15"
          : "border-white/15 bg-white/[0.03]"
      } ${locked ? "opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={locked}
        onChange={(event) => {
          handleFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />

      {currentUrl && !compact ? (
        <img
          src={currentUrl}
          alt=""
          className="mx-auto mb-2 h-20 w-auto rounded border border-white/10 object-contain"
        />
      ) : null}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={locked}
        className={`rounded px-3 py-1.5 text-xs font-medium transition ${
          locked
            ? "bg-white/10 text-gray-400"
            : "bg-violet-600 text-white hover:bg-violet-700"
        }`}
      >
        {busy ? "Envoi..." : label}
      </button>

      {!compact ? (
        <p className="mt-1 text-[11px] text-gray-500">
          Glisse une image ici, ou clique pour la choisir.
        </p>
      ) : null}
    </div>
  );
}
