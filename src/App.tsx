import { useEffect, useState } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/tauri';
import { dialog } from '@tauri-apps/api';
import { message, Button, Select, Input, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import cx from 'classnames';
import s from './App.module.css';
import { readDir } from '@tauri-apps/api/fs';

interface ImageData {
  path: string;
  thumb: string;
}

/**
 * 1d, 3d, 1w,
1M*
, 3M, 6M, 1y
 */
const enum TopRange {
  oneDay = '1d',
  threeDay = '3d',
  oneWeek = '1w',
  oneMonth = '1M',
  threeMonth = '3M',
  sixMonth = '6M',
  oneYear = '1y',
}

/**
 * relevance, random, views, favorites, toplist
 */
const enum Sorting {
  relevance = 'relevance',
  random = 'random',
  views = 'views',
  favorites = 'favorites',
  toplist = 'toplist',
}

function App() {
  const [imgs, setImgs] = useState<ImageData[]>();
  const [localImgs, setLocalImgs] = useState<string[]>();
  const [directory, setDirectory] = useState<string>('');
  const [selectedImg, setSelectedImg] = useState<string>('');
  const [atleast, setAtleast] = useState<String>('1920x1080');
  const [apiKey, setApiKey] = useState<String>('');
  const [netLen, setNetLen] = useState<number>(20);
  const [topRange, setTopRange] = useState<TopRange>(TopRange.oneMonth);
  const [sorting, setSorting] = useState<Sorting>(Sorting.toplist);

  const fetchData = async () => {
    message.loading('加载中...', 0);
    const res = await invoke<Array<ImageData>>('get_data', {
      atleast,
      apikey: apiKey,
      len: netLen,
      topRange,
      sorting,
    });
    message.destroy();
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
      // 刷新文件夹
      loadCurrentImages();
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
  const loadCurrentImages = async (directoryParam: string = directory) => {
    if (!directoryParam) {
      return;
    }

    readDir(directoryParam).then((res) => {
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

  const onResolutionChange = (value: string) => {
    setAtleast(value);
  };

  const LocalImageTab = (
    <>
      <h2>本地文件：</h2>
      <div className={s.localRow}>
        {localImgs?.map((img, i) => (
          <img
            src={img}
            alt="localImg"
            className={s.localImg}
            key={i}
            onClick={() => setBgImg(img)}
          />
        ))}
      </div>
    </>
  );

  const NetImageTab = (
    <>
      <h2>网络图片（点击下载并设置）：</h2>
      <div className={s.selectorWrapper}>
        <Select
          defaultValue="1920x1080"
          style={{ width: 120 }}
          onChange={onResolutionChange}
          options={[
            { value: '1920x1080', label: '1920x1080' },
            { value: '3440x1440', label: '3440x1440' },
          ]}
        />
        <Input
          placeholder="api key"
          onChange={(e) => setApiKey(e.currentTarget.value)}
        />
        <Select
          defaultValue={netLen}
          style={{ width: 120 }}
          onChange={(value) => setNetLen(Number(value))}
          options={[
            { value: 5, label: '5' },
            { value: 10, label: '10' },
            { value: 20, label: '20' },
            { value: 50, label: '50' },
            { value: 100, label: '100' },
          ]}
        />
        <Select
          defaultValue={TopRange.oneMonth}
          style={{ width: 120 }}
          onChange={(value) => setTopRange(value as TopRange)}
          options={[
            { value: TopRange.oneDay, label: '1天' },
            { value: TopRange.threeDay, label: '3天' },
            { value: TopRange.oneWeek, label: '1周' },
            { value: TopRange.oneMonth, label: '1月' },
            { value: TopRange.threeMonth, label: '3月' },
            { value: TopRange.sixMonth, label: '6月' },
            { value: TopRange.oneYear, label: '1年' },
          ]}
        />
        <Select
          defaultValue={Sorting.toplist}
          style={{ width: 120 }}
          onChange={(value) => setSorting(value as Sorting)}
          options={[
            { value: Sorting.relevance, label: '相关度' },
            { value: Sorting.random, label: '随机' },
            { value: Sorting.views, label: '浏览量' },
            { value: Sorting.favorites, label: '收藏量' },
            { value: Sorting.toplist, label: '排行榜' },
          ]}
        />
      </div>
      <Button
        type="primary"
        size="large"
        className={s.downloadBtn}
        onClick={fetchData}
      >
        {imgs?.length ? '重新加载照片' : '加载照片'}
      </Button>
      <div className={s.netRow}>
        {imgs?.map((img, i) => (
          <div
            className={cx(s.netCell, {
              [s.selected]: selectedImg === img.path,
            })}
            onClick={() => setSelectedImg(img.path)}
          >
            <img src={img.thumb} alt="img" key={i} className={s.netImg} />
            {selectedImg === img.path && (
              <div className={s.actions}>
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
    </>
  );

  const tabItems: TabsProps['items'] = [
    {
      key: 'local',
      label: '本地图片',
      children: LocalImageTab,
    },
    {
      key: 'net',
      label: '网络加载图片',
      children: NetImageTab,
    },
  ];

  return (
    <div className={s.container}>
      <h1>Wallpaper Gallery</h1>
      <div className={s.chooseBtnWrapper}>
        {/* 选择文件夹 */}
        <Button onClick={selectDirectory}>选择文件夹</Button>
        <p>当前选择的文件夹：{directory}</p>
      </div>
      <Tabs defaultActiveKey="local" items={tabItems} />
    </div>
  );
}

export default App;
