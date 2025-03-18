// Frontend (React + TypeScript)
import React, { useEffect, useState } from "react";
import axios from "axios";

interface RowData {
  [key: string]: string | number;
}

const App: React.FC = () => {
  const [data, setData] = useState<RowData[]>([]);
  const [filter, setFilter] = useState("");

  const fetchData = () => {
    axios
      .get("http://localhost:5000/data", { params: { filter } })
      .then((res) => setData(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h1 style={{ textAlign: "center" }}>Snowflake Data</h1>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Enter filter condition"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: "8px", marginRight: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
        />
        <button
          onClick={fetchData}
          style={{ padding: "8px 12px", borderRadius: "5px", border: "none", backgroundColor: "#007bff", color: "white", cursor: "pointer" }}
        >
          Search
        </button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)" }}>
        <thead>
          <tr style={{ backgroundColor: "#007bff", color: "white", textAlign: "left" }}>
            {data.length > 0 &&
              Object.keys(data[0]).map((key) => (
                <th key={key} style={{ padding: "10px", borderBottom: "2px solid #ddd" }}>{key}</th>
              ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#f2f2f2" : "#ffffff" }}>
              {Object.values(row).map((val, j) => (
                <td key={j} style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>{val}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;
