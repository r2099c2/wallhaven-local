// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lazy_static::lazy_static;
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

// 文件夹位置的变量
lazy_static! {
    static ref DIRECTORY: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
}

/**
 * wallhaven 参数
 */
#[derive(Deserialize, Serialize)]
#[allow(non_snake_case)]
struct WallhavenParams {
    sorting: String,
    order: String,
    seed: i32,
    page: i32,
    categories: String,
    purity: i32,
    atleast: String,
    ratios: String,
    topRange: String,
}

/**
 * 获取壁纸数据
 */
fn get_wallpaper_data() -> Result<String, String> {
    let q = WallhavenParams {
        sorting: "toplist".to_string(),
        order: "desc".to_string(),
        seed: 1,
        page: 1,
        categories: "111".to_string(),
        purity: 100,
        topRange: "3d".to_owned(),
        atleast: "1920x1080".to_string(),
        ratios: "16x9".to_string(),
    };

    let url = "https://wallhaven.cc/api/v1/search?".to_owned()
        + serde_qs::to_string(&q).unwrap().as_str();
    let resp = reqwest::blocking::get(url).unwrap();
    let body = resp.text().unwrap();
    Ok(body)
}

/**
 * 将原始数据转换为图片列表
 */
fn convert_to_image_list(data: String) -> Vec<String> {
    let json: serde_json::Value = serde_json::from_str(&data).unwrap();
    let mut image_list: Vec<String> = Vec::new();
    for item in json["data"].as_array().unwrap() {
        let image_url = item["path"].as_str().unwrap();
        image_list.push(image_url.to_string());
    }
    image_list
}

/**
 * 获取随机 5 张壁纸
 */
fn get_random_images(image_list: Vec<String>) -> Vec<String> {
    let mut rng = rand::thread_rng();
    let mut random_images: Vec<String> = Vec::new();
    for _ in 0..5 {
        let random_index = rng.gen_range(0..image_list.len());
        let random_image = image_list[random_index].clone();
        random_images.push(random_image);
    }
    random_images
}

/**
 * 返回数据到前端
 * Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
 */
#[tauri::command]
fn get_data() -> Vec<String> {
    let data = get_wallpaper_data().unwrap();
    let image_list = convert_to_image_list(data);
    get_random_images(image_list)
}

/**
 * 获取图片 URL 为入参，并设置为 windows 的壁纸
 */
#[tauri::command]
fn set_wallpaper(image_url: String) -> bool {
    println!("url: {}", image_url);
    let resp = reqwest::blocking::get(image_url.clone()).unwrap();
    let body = resp.bytes().unwrap();

    // 在 DIRECTORY 目录下保存图片
    let dir = DIRECTORY.lock().unwrap();
    // 使用 image_url 最后一段作为文件名
    let image_name = image_url.split("/").last().unwrap();
    let filename = format!("{}/{}", *dir, image_name);
    let filename_clone = filename.clone(); // Clone the filename
    let mut file = std::fs::File::create(filename_clone).unwrap();
    std::io::copy(&mut body.as_ref(), &mut file).unwrap();

    let path = std::path::Path::new(&filename);
    let result = wallpaper::set_from_path(path.to_str().unwrap());
    match result {
        Ok(_) => {
            println!("set wallpaper success");
            true
        }
        Err(_) => {
            println!("set wallpaper failed");
            false
        }
    }
}

/**
 * 接收前端传递的文件夹位置，作为壁纸存储位置
 */
#[tauri::command]
fn set_directory(directory: String) {
    let mut dir = DIRECTORY.lock().unwrap();
    *dir = directory;
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_data,
            set_wallpaper,
            set_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
