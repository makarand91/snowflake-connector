import React, { useState } from "react";
import axios from "axios";

const Download: React.FC = () => {
  const [filename, setFilename] = useState("");

  const handleDownload = async () => {
    const res = await axios.get(`http://localhost:5000/download/${filename}`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div>
      <h2>Download File from S3</h2>
      <input type="text" placeholder="Filename" onChange={(e) => setFilename(e.target.value)} />
      <button onClick={handleDownload}>Download</button>
    </div>
  );
};

export default Download;
