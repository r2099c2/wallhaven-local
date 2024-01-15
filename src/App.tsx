import { useEffect, useState } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/tauri';
import { dialog } from '@tauri-apps/api';
import { message, Button } from 'antd';
import cx from 'classnames';
import './App.css';
import { BaseDirectory, readDir } from '@tauri-apps/api/fs';

interface ImageData {
  path: string;
  thumb: string;
}

function App() {
  const [imgs, setImgs] = useState<ImageData[]>();
  const [localImgs, setLocalImgs] = useState<string[]>();
  const [directory, setDirectory] = useState<string>('');
  const [selectedImg, setSelectedImg] = useState<string>('');

  const fetchData = async () => {
    const res = await invoke<Array<ImageData>>('get_data');
    setImgs(res);
  };

  const setBgImg = async (filePath: string) => {
    message.loading('设置中...', 10);
    const res = await invoke('set_wallpaper', { filePath });
    message.destroy();
    if (res) {
      message.info('设置成功');
    } else {
      message.error('设置失败');
    }
  };

  const loadAndSetWallpaper = async (imageUrl: string) => {
    message.loading('设置中...', 0);
    const res = await invoke('load_and_set_wallpaper', { imageUrl });
    message.destroy();
    if (res) {
      message.info('设置成功');
    } else {
      message.error('设置失败');
    }
  };

  /**
   * 下载图片到文件夹
   */
  const downloadImage = async (imageUrl: string) => {
    message.loading('下载中...', 0);
    const res = await invoke('download_image', { imageUrl });
    message.destroy();
    if (res) {
      message.info('下载成功');
    } else {
      message.error('下载失败');
    }
  };

  useEffect(() => {
    // 从本地获取缓存的文件夹路径
    invoke<string>('get_directory').then((res) => {
      if (res) {
        setDirectory(res);
        // 从文件夹中遍历图片文件
        loadCurrentImages(res);
      }
    });
  }, []);

  // 从文件夹中遍历图片文件
  const loadCurrentImages = async (directory: string) => {
    if (!directory) {
      return;
    }

    readDir('wallpaper', { dir: BaseDirectory.Picture }).then((res) => {
      const imgs = res
        .filter(
          (item) => item.name?.endsWith('.jpg') || item.name?.endsWith('.png')
        )
        .map((item) => convertFileSrc(item.path));
      setLocalImgs(imgs);
    });
  };

  // 选择文件夹并将文件夹路径传给rust
  const selectDirectory = async () => {
    const path = await dialog.open({
      directory: true,
    });
    if (path) {
      let directory;
      if (Array.isArray(path)) {
        directory = path[0];
      } else {
        directory = path;
      }
      setDirectory(directory);
      // 将文件地址存储到本地文件
      invoke('set_directory', { directory: path });
    }
  };

  return (
    <div className="container">
      <h1>Wallpaper Gallery</h1>
      <div>
        {/* 选择文件夹 */}
        <button onClick={selectDirectory}>选择文件夹</button>
        <p>当前选择的文件夹：{directory}</p>
      </div>
      <h2>网络图片（点击下载并设置）：</h2>
      <Button
        type="primary"
        size="large"
        className="download-btn"
        onClick={fetchData}
      >
        下载新的照片
      </Button>
      <div className="net-row">
        {imgs?.map((img, i) => (
          <div
            className={cx('net-cell', { selected: selectedImg === img.path })}
            onClick={() => setSelectedImg(img.path)}
          >
            <img src={img.thumb} alt="img" key={i} className="net-img" />
            {selectedImg === img.path && (
              <div className="actions">
                <Button onClick={() => loadAndSetWallpaper(img.path)}>
                  下载并设置
                </Button>
                <Button type="primary" onClick={() => downloadImage(img.path)}>
                  仅下载
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <h2>本地文件：</h2>
      <div className="local-row">
        {localImgs?.map((img, i) => (
          <img
            src={img}
            alt="localImg"
            className="local-img"
            key={i}
            onClick={() => setBgImg(img)}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
