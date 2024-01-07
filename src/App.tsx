import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import './App.css';

function App() {
  const fetchData = async () => {
    const res = await invoke('get_data');
    console.log(res);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return <div className="container"></div>;
}

export default App;
