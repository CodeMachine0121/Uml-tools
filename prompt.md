我需要一個可以手動繪製 uml 圖的平台, 以下會列出幾項需求

## Dev Env
1. 使用 `bun` 進行打包
2. 框架為 `svelte`
3. 須符合 clean archetecture, clean code

## User Story
### 2025/06/29 Project Construct
- 畫面的左邊會有個 toolbox,  使用者應該要能夠從裡面選取 對應的東西（如介面, 類別, 依賴箭頭, 實做箭頭... 等等）出來繪製
- 選取完畢後使用者要可以透過滑鼠拉選的方始開始繪製
- 使用者可以按兩下滑鼠 來新增 text input 
- 接著需要有個按鈕 輸出對應的 mermaid, 同時也需要能夠反向轉換, 使用者 import  mermaid 產生對應的圖


### 2025/06/29 Feature for User Operation
- 使用者可以在 `toolbox` 中選擇 **箭頭** 並在畫布上面將兩個物件連接起來
- 一個物件目前提供 上面, 右邊, 下方, 左邊 四個方向的點 供使用者連接
- 繪製完的物件圖形, 使用者可以透過拖曳來調整位置 且 要可以調整大小
- 使用者可以透過點擊物件來選取, 並且可以透過按鍵刪除物件
- 使用者可以透過 cursor 在物件上面點擊來選取物件, 並且可以透過按鍵刪除物件
- 使用者可以在物件下按下 + 來新增屬性/成員/方法
- 使用者可以在物件下按下 - 來刪除屬性/成員/方法
- 使用者可以在物件下按下 * 來更新屬性/成員/方法

### 2025/06/29 Feature for Import/Export
- 使用者可以點擊 "Export to Mermaid" 按鈕來生成對應的 Mermaid 代碼
- 使用者可以點擊 "Import from Mermaid" 按鈕來導入 Mermaid 代碼並生成對應的圖形
- 導入的 Mermaid 代碼應該能夠正確解析並顯示在畫布上
- 使用者可以點擊　"Import from C#" 按鈕來導入 C# 代碼並生成對應的圖形
- 導入的 C# 代碼應該能夠正確解析並顯示在畫布上
- 使用者可以點擊 "Export to C#" 按鈕來生成對應的 C# 代碼

### 2025/06/30 Fix Bug
- Export to Mermaid/C# 需要連同關聯關係也考量進去
- Export to Mermaid/C# 需要連同屬性/成員/方法也考量進去
- 使用者可以透過 cursor 來調整物件大小及位置
- 使用者可以透過 cursor 來重新連結物件之間的關聯

### 2025/06/30 Feature for saving with image
- 使用者可以點擊 "Save as Image" 按鈕來將當前畫布保存為圖片
- 保存的圖片應該能夠包含所有繪製的物件和連線
- 保存的圖片格式應該為 PNG
