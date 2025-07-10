"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    google: any;
    gapi: any;
    _pickerLoaded?: boolean;
  }
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace google {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    namespace picker {
      // Types are not important for this quick integration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type ResponseObject = any;
      const Response: any;
      const Action: any;
      const ViewId: any;
      const DocsView: any;
      const PickerBuilder: any;
    }
  }
}

interface Props {
  accessToken: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPicked: (docs: any) => void;
  onClose: () => void;
}

// Load external Google API script only once
function loadPickerScript(callback: () => void) {
  if (typeof window === "undefined") return;
  if ((window as any)._pickerLoaded) {
    callback();
    return;
  }
  const script = document.createElement("script");
  script.src = "https://apis.google.com/js/api.js";
  script.onload = () => {
    (window as any)._pickerLoaded = true;
    callback();
  };
  document.body.appendChild(script);
}

export default function GoogleDrivePicker({ accessToken, onPicked, onClose }: Props) {
  useEffect(() => {
    loadPickerScript(() => {
      // @ts-ignore
      window.gapi.load("picker", { callback: createPicker });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function createPicker() {
    const googleApi = window.google;
    if (!googleApi?.picker) return;
    const view = new googleApi.picker.DocsView(googleApi.picker.ViewId.FOLDERS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true);

    const picker = new googleApi.picker.PickerBuilder()
      .setOAuthToken(accessToken)
      .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY!)
      .addView(view)
      .setCallback((data: any) => {
        if (data[googleApi.picker.Response.ACTION] === googleApi.picker.Action.PICKED) {
          onPicked(data);
        }
        onClose();
      })
      .build();

    picker.setVisible(true);
  }

  return null; // Picker is a separate overlay
} 