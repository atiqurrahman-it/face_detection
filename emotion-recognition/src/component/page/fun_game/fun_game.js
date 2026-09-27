import { useState } from "react";
import AdminLayout from "../../layout/AdminLayout";
import RealFaceDetection from "../face_detection/face_detection";
import ImageInput from "../image_input/image_input";

const TABS = [
  { id: "webcam", label: "Live Webcam" },
  { id: "upload", label: "Image Upload" },
];

export default function FunGame() {
  const [activeTab, setActiveTab] = useState("webcam");

  return (
    <AdminLayout title="Fun Game">
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Play with the detection engine that powers case matching.
      </p>
      <div className="mb-6 flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "webcam" ? <RealFaceDetection /> : <ImageInput />}
    </AdminLayout>
  );
}
