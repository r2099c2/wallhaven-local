// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/**
 * 获取壁纸数据
 */
fn get_wallpaper_data() -> Result<String, String> {
    let url = "https://wallhaven.cc/api/v1/search?sorting=random&order=desc&seed=1&page=1&categories=111&purity=100&atleast=1920x1080&ratios=16x9&colors=000000";
    let resp = reqwest::blocking::get(url).unwrap();
    let body = resp.text().unwrap();
    Ok(body)
}

/**
 * 将原始数据转换为图片列表
 */
fn convert_to_image_list(data: String) -> Result<String, String> {
    let json: serde_json::Value = serde_json::from_str(&data).unwrap();
    let mut image_list: Vec<String> = Vec::new();
    let mut image_list_str = String::new();
    for item in json["data"].as_array().unwrap() {
        let image_url = item["path"].as_str().unwrap();
        image_list.push(image_url.to_string());
    }
    for item in image_list {
        image_list_str.push_str(&item);
        image_list_str.push_str("\n");
    }
    Ok(image_list_str)
}

/**
 * 返回数据到前端
 */
#[tauri::command]
fn get_data() -> Vec<String> {
    let data = get_wallpaper_data().unwrap();
    let image_list = convert_to_image_list(data).unwrap();
    let mut image_list_vec: Vec<String> = Vec::new();
    for item in image_list.split("\n") {
        image_list_vec.push(item.to_string());
    }
    image_list_vec
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
