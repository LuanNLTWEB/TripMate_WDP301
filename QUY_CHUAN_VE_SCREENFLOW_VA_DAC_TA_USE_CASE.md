# QUY CHUẨN VẼ SCREEN FLOW & VIẾT BẢNG ĐẶC TẢ USE CASE (TRIPMATE PROJECT)

> **Mục đích tài liệu:** Hướng dẫn chi tiết, chuẩn hóa quy tắc và cung cấp template mẫu để khi cần vẽ Screen Flow cho bất kỳ Actor nào (Customer, Tour Provider, Staff, Admin) hoặc viết bảng Đặc tả Use Case cho bất kỳ chức năng nào từ file `TripMate_Complete.xlsx`, AI/người thực hiện có thể tuân thủ 100% chuẩn định dạng, cấu trúc và tính nhất quán giữa **Code - Sequence Diagram - Class Diagram - Screen Flow - Bảng Đặc Tả**.

---

## PHẦN 1: QUY CHUẨN VẼ SCREEN FLOW TRÊN DRAW.IO

### 1.1. Quy tắc đặt tên Màn hình / Hộp thoại (Nodes)
* **100% phải là DANH TỪ hoặc CỤM DANH TỪ (Noun Phrase)** gắn liền trực tiếp với chức năng (Feature/Use Case).
* **TUYỆT ĐỐI KHÔNG** chứa các từ: `Page`, `Screen`, `Popup`, `Modal`.
* **Chuyển đổi từ Động từ/Hành động sang Danh từ chuẩn**:
  * ❌ *Print Itinerary* ➔  **`Itinerary Export`**
  * ❌ *Create Itinerary* ➔  **`Itinerary Creation`**
  * ❌ *Edit Itinerary* ➔  **`Itinerary Update`**
  * ❌ *Delete Itinerary* ➔  **`Itinerary Deletion`**
  * ❌ *Duplicate Itinerary* ➔  **`Itinerary Duplication`**
  * ❌ *Optimize Route* ➔  **`Route Optimization`**
  * ❌ *Calculate Budget* ➔  **`Budget Calculation`**
  * ❌ *Register* ➔  **`Registration`**
  * ❌ *Verify OTP* ➔  **`OTP Verification`**
  * ❌ *Forgot Password* ➔  **`Password Recovery`**
  * ❌ *Reset Password* ➔  **`Password Reset`**
  * ❌ *Change Password* ➔  **`Password Change`**
  * ❌ *Cancel Booking* ➔  **`Booking Cancellation`**
  * ❌ *Report Review* ➔  **`Review Report`**

### 1.2. Quy chuẩn Hình khối (Shapes)
| Loại màn hình | Hình khối trong Draw.io | Giá trị Style XML |
| :--- | :--- | :--- |
| **Màn hình chính (Screen / Page)** | **Hình chữ nhật (Rectangle)** | `whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=1;fontSize=12;fontStyle=1;align=center;verticalAlign=middle;` |
| **Hộp thoại / Cửa sổ phụ (Popup / Modal)** | **Hình Oval (Ellipse)** | `ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=1;fontSize=12;fontStyle=1;align=center;verticalAlign=middle;` |

### 1.3. Khung Chú thích bắt buộc (Legend)
Đặt ở góc dưới cùng bên trái biểu đồ:
* Một hình chữ nhật ghi: **`This is page`**
* Một hình Oval ghi: **`This is popup`**
* Nhãn tiêu đề dưới khung: **`Screen flow of [Actor]`** *(Ví dụ: `Screen flow of Customer`, `Screen flow of Tour Provider`, `Screen flow of Staff`, `Screen flow of Admin`)*.

### 1.4. Quy chuẩn Nhãn chuyển màn (Transitions / Edges)
* **Thao tác người dùng**: Viết bằng tiếng Anh mô tả hành vi + **nhãn nút bấm / menu tiếng Việt chính xác trong code đặt trong ngoặc kép**:
  * `Click "Đăng nhập" in header`
  * `Click "Tài khoản của tôi" in header`
  * `Click "Lịch trình của tôi" in header`
  * `Click "Xem chi tiết" button`
  * `Click "Đặt tour ngay" button`
  * `Click "Hủy tour" button`
  * `Click "Tối ưu lộ trình" button`
  * `Click "Tính ngân sách" button`
  * `Click "Xuất lịch trình" button`
* **Kết quả xử lý hệ thống**: Ghi ngắn gọn trạng thái:
  * `Login success`, `Registration success`, `Email OTP`, `OTP is successful`, `Booking successful`, `Cancellation confirmed`.
* **Quy tắc cú pháp XML Draw.io**: Mọi dấu ngoặc kép trong thuộc tính `value` của XML phải escape thành `&quot;` (ví dụ: `value="Click &quot;Đăng nhập&quot; in header"`), ký tự `&` phải thành `&amp;`.

---

## PHẦN 2: QUY CHUẨN BẢNG ĐẶC TẢ USE CASE (USE CASE SPECIFICATION)

Cấu trúc bảng đặc tả trong tài liệu Word gồm đúng 15 hàng tiêu chuẩn như sau:

| STT | Tên trường | Quy cách và nguyên tắc nội dung |
| :---: | :--- | :--- |
| 1 | **UC ID and Name:** | `UC-[ID] – [Tên Use Case]` *(Ví dụ: `UC-11 – Search Destination`, `UC-71 – Create Booking`)* |
| 2 | **Created By:** \| **Date Created:** | Tên người phụ trách (VD: `ChiDNK`) \| Ngày tạo (VD: `02/10/2026`) |
| 3 | **Primary Actor:** \| **Secondary Actors:** | Tác nhân chính (Guest / Customer / Tour Provider / Staff / Admin) \| Tác nhân phụ (None / Email Service / Payment Gateway) |
| 4 | **Description:** | Tóm tắt mục đích và giá trị người dùng nhận được khi thực hiện chức năng. |
| 5 | **Trigger:** | Hành động cụ thể của Actor kích hoạt Use Case (VD: *The customer clicks the "Đặt tour ngay" button on a tour details view.*) |
| 6 | **Preconditions:** | Đánh số tiền điều kiện: `PRE-1: ...`, `PRE-2: ...` (Kèm gọi nhánh `(A1)` nếu điều kiện tiên quyết có thể không thỏa mãn). |
| 7 | **Postconditions:** | Đánh số hậu điều kiện sau khi hoàn tất luồng chính: `POST-1: ...`, `POST-2: ...` |
| 8 | **Normal Flow:** | **Luồng nghiệp vụ thông thường (Các quy tắc cốt lõi):**<br/>1. Đánh số bước: `1.`, `2.`, `3.`,...<br/>2. **THUẦN TÚY MÔ TẢ**, TUYỆT ĐỐI KHÔNG ghi tên hàm, method, class hay code (VD: không ghi `bookingController.create()`).<br/>3. Tên nút bấm giao diện viết tiếng Việt chuẩn theo code và đặt trong ngoặc kép: `"Tìm kiếm"`, `"Đặt tour ngay"`, `"Xóa"`,...<br/>4. **BẮT BUỘC GỌI NHÁNH**: Cuối câu của bước phát sinh rẽ nhánh phải gắn tag: `(A1)`, `(A2)`, `(E1)`. |
| 9 | **Alternative Flows:** | **Luồng rẽ nhánh & Lỗi dữ liệu người dùng:**<br/>1. Đánh số mã nhánh: `A1. [Tên nhánh]:`, `A2. [Tên nhánh]:`<br/>2. Các bước xử lý con đánh số: `1.`, `2.`, `3.`...<br/>3. **NGUYÊN TẮC BẮT BUỘC**: Tất cả lỗi nhập liệu (Invalid Input), bỏ trống, vượt quá độ dài, sai định dạng email/SĐT, hết chỗ trống, không tìm thấy kết quả, hủy xác nhận, xung đột lịch,... **ĐỀU LÀ ALTERNATIVE FLOWS, KHÔNG ĐƯỢC ĐƯA VÀO EXCEPTIONS**. |
| 10 | **Exceptions:** | **Sự cố hạ tầng / hệ thống:**<br/>1. Đánh số mã: `E1. [Tên sự cố]:`<br/>2. Các bước con: `1. The system displays an error notification: "Không thể kết nối đến máy chủ. Vui lòng thử lại sau".`<br/>3. **NGUYÊN TẮC BẮT BUỘC**: Chỉ áp dụng cho lỗi Database disconnect/timeout, mất kết nối mạng client, hoặc máy chủ trả về lỗi 500. |
| 11 | **Priority:** | Lấy trực tiếp từ file `TripMate_Complete.xlsx`:<br/>• Thuộc `Iter1` hoặc chức năng lõi giao dịch: **`High`**<br/>• Chức năng cấu hình / nghiệp vụ mở rộng: **`Medium`**<br/>• Chức năng phụ trợ / báo cáo: **`Low`** |
| 12 | **Frequency of Use:** | Tần suất sử dụng mô tả bằng tiếng Anh (*Very frequently*, *Frequently*, *Moderate*, *Rare*). |
| 13 | **Business Rules:** | **CHỈ LIỆT KÊ MÃ BR (BR IDs)** tương ứng từ Mục 2 của tài liệu SRS (VD: `BR-83, BR-84, BR-85` hoặc `BR-29`), **TUYỆT ĐỐI KHÔNG** chép cả đoạn mô tả dài dòng. |
| 14 | **Other Information:** | Thông tin bổ trợ (cơ chế phân trang, lưu cache, SLA xử lý,...). |
| 15 | **Assumptions:** | Giả định môi trường (trình duyệt bật JavaScript, mạng ổn định,...). |

---

## PHẦN 3: MA TRẬN 115 BUSINESS RULES CỦA HỆ THỐNG TRIPMATE

Khi đặc tả Use Case, tra cứu mã BR tương ứng trong danh mục 115 quy tắc chính thức:

* **Tài khoản & Xác thực:** `BR-01` (Unique Account), `BR-02` (Email Regex), `BR-03` (Password Strength), `BR-04` (VN Phone Regex), `BR-05` (Gender Enum), `BR-06` (Min Age 16), `BR-07` (JWT 7 Days), `BR-08` (Rate Limit 5 fails/15m), `BR-09` (OTP 10m/3 fails), `BR-10` (OTP Cooldown 60s), `BR-11` (Current Password Check), `BR-12` (Self Profile), `BR-13` (Soft Delete Account).
* **Phân quyền & Vai trò:** `BR-14` (Admin Self-Protect), `BR-15` (4 Default Roles), `BR-16` (Default Role Immutability), `BR-17` (Custom Role Length 2-50), `BR-18` (Role Deletion Guard), `BR-19` (Role Cascading), `BR-20` (Role Fallback to Customer), `BR-21` (Role Matrix View), `BR-22` (Active/Inactive Toggle).
* **Nhật ký Admin (ActivityLog):** `BR-23` (Auto Audit Log), `BR-24` (Log Immutability), `BR-25` (Log Schema), `BR-26` (Action Codes), `BR-27` (Target Types), `BR-28` (Admin Only Access).
* **Yêu thích (Favorites):** `BR-29` (Destination Favorite Toggle Uniqueness), `BR-30` (Tour Favorite Toggle Uniqueness).
* **Điểm đến (Destinations):** `BR-31` (Staff/Admin Destination Authority), `BR-32` (Only Active Destination Visible), `BR-33` (Popular Destination Flag), `BR-34` (Category Constraint), `BR-35` (Operational Status), `BR-36` (Destination Soft Delete).
* **Quản lý Tour:** `BR-37` (Provider Tour Eligibility), `BR-38` (Tour Lifecycle Draft/Pending/Approved/Suspended), `BR-39` (Tour Rejection Justification), `BR-40` (Tour Revision Feedback), `BR-41` (Tour Suspension), `BR-42` (Tour Restoration), `BR-43` (Provider Ownership Boundary), `BR-44` (Active Tour Deletion Guard), `BR-45` (Withdraw Submission), `BR-46` (Tour Category Uniqueness & Delete Guard).
* **Khởi hành & Giá tour:** `BR-47` (Departure Lead Time > 24h), `BR-48` (Duration Calc), `BR-49` (Recurring Schedule), `BR-50` (Tour Capacity Constraints), `BR-51` (Capacity Cannot Lower Below Booked), `BR-52` (Adult Price > 0), `BR-53` (Price Update for New Bookings Only), `BR-54` (Departure Cancel Refund), `BR-55` (Multi-param Tour Filter), `BR-56` (Tour Sorting), `BR-57` (Real-time Seat Check: Capacity - Booked).
* **Lịch trình cá nhân (Itinerary):** `BR-58` (Itinerary Date Span), `BR-59` (Budget Integrity), `BR-60` (Activity Date Containment), `BR-61` (Temporal Validity), `BR-62` (Activity Conflict Detection), `BR-63` (Sequential Ordering), `BR-64` (Destination Linking), `BR-65` (Tour Inclusion in Schedule), `BR-66` (Budget Summation by Category), `BR-67` (Owner Only Delete/Edit), `BR-68` (Collaborator Invite), `BR-69` (Collaborator Access View/Edit), `BR-70` (Invitation Lifecycle), `BR-71` (Collaborator Removal), `BR-72` (Sole Ownership Rule), `BR-73` (Duplication Isolation - Clone activities, strip collaborators), `BR-74` (Comments), `BR-75` (Export PDF/Doc).
* **Công cụ AI & Tối ưu lộ trình:** `BR-76` (AI Inputs), `BR-77` (AI Budget Ceiling), `BR-78` (Geographic TSP Route Optimization), `BR-79` (Operating Hours Conformance), `BR-80` (Recommendation Profile), `BR-81` (AI Rate Limiting), `BR-82` (AI Mutation Confirmation).
* **Đặt tour (Booking):** `BR-83` (Min 1 Adult Passenger), `BR-84` (Temporary Seat Locking), `BR-85` (Unpaid Booking 24h Expiry), `BR-86` (Booking Confirmation Trigger), `BR-87` (Provider SLA), `BR-88` (Cancellation Refund Tiers), `BR-89` (Complete Timing After Tour Concludes), `BR-90` (Provider Privacy), `BR-91` (Self Booking History Only), `BR-92` (Dispute Mediation), `BR-93` (Complaint Eligibility), `BR-94` (Complaint SLA).
* **Thanh toán & Hoàn tiền:** `BR-95` (Order Total Formula), `BR-96` (Transaction Idempotency), `BR-97` (Payment Failure Recovery), `BR-98` (Refund Qualification), `BR-99` (Refund Approval), `BR-100` (Settlement Window), `BR-101` (Immutable Payment Ledger).
* **Đánh giá & Kiểm duyệt:** `BR-102` (Completed Booking Only Eligible for Review), `BR-103` (Review Uniqueness 1 review/booking), `BR-104` (Score 1-5 Stars), `BR-105` (Review States), `BR-106` (Average Rating Formula), `BR-107` (Review Violation Report), `BR-108` (Staff Moderation), `BR-109` (Review Delete Privileges).
* **Thông báo & Thống kê:** `BR-110` (Auto Triggers), `BR-111` (Read Management), `BR-112` (Manual Broadcast), `BR-113` (Cleanup 90 days), `BR-114` (Announcement Authority), `BR-115` (Dashboard Stats Scope).

---

## PHẦN 4: NGUYÊN TẮC BẢO ĐẢM "4 TRỤ CỘT ĐỒNG BỘ 100%"

Mỗi Use Case khi được mô tả phải thỏa mãn sự thống nhất hoàn toàn giữa 4 thành phần:
1. **Source Code**:
   * Tên Controller, Router và Model MongoDB tương ứng (VD: `bookingController.createBooking` -> `POST /api/bookings` -> Model `Booking.js`).
   * Các thông báo lỗi (`errors.array()[0].msg`) và nút bấm giao diện phải trùng khớp với mã nguồn.
2. **Sequence Diagram (File `.drawio`)**:
   * Trình tự tương tác giữa: `Actor` ➔ `View` ➔ `API Client` ➔ `Router` ➔ `Controller` ➔ `Model` ➔ `MongoDB`.
   * Các thông điệp gửi/nhận phải tương ứng với các bước trong Normal Flow và Alternative Flows.
3. **Class Diagram (File `.drawio`)**:
   * Các phương thức (methods) và thuộc tính (attributes) được gọi trong Use Case phải tồn tại trong Class Diagram tương ứng.
4. **Bảng Đặc Tả & Screen Flow**:
   * Tên màn hình phải khớp với các Node trong Screen Flow (100% Danh từ).
   * Các nút bấm kích hoạt bước tiếp theo phải đúng nhãn hiển thị.

---

## PHẦN 5: MẪU LỆNH PROMPT KHI YÊU CẦU AI THỰC HIỆN TIẾP

Khi bạn muốn yêu cầu AI vẽ Screen Flow hoặc viết đặc tả cho một Actor hoặc thành viên khác (Bảo, Mai, Phúc, Toàn, Luân), bạn chỉ cần gửi prompt ngắn gọn theo mẫu sau:

### Mẫu 1: Yêu cầu vẽ Screen Flow cho Actor mới
```text
Dựa theo file quy chuẩn @QUY_CHUAN_VE_SCREENFLOW_VA_DAC_TA_USE_CASE.md và file @TripMate_Complete.xlsx, hãy vẽ Screen Flow cho Actor [Tour Provider / Staff / Admin] vào file .drawio:
- Tên các màn hình 100% là danh từ gắn với chức năng.
- Phân biệt rõ Page (hình chữ nhật) vs Popup (hình oval).
- Nhãn nút bấm tiếng Việt chuẩn theo code.
- Có khung Legend "Screen flow of [Actor]".
```

### Mẫu 2: Yêu cầu viết bảng đặc tả Use Case
```text
Dựa theo file quy chuẩn @QUY_CHUAN_VE_SCREENFLOW_VA_DAC_TA_USE_CASE.md, hãy hoàn thành bảng đặc tả cho các Use Case: [Liệt kê mã UC, ví dụ: UC-31, UC-36,...] của [Tên thành viên]:
- Normal Flow thuần mô tả tương tác và gắn tag (A1), (A2), (E1).
- Alternative Flows đánh số A1, A2 và chứa toàn bộ lỗi invalid input.
- Exceptions đánh số E1 chỉ chứa lỗi hệ thống/database.
- Priority lấy chuẩn từ TripMate_Complete.xlsx.
- Mục Business Rules chỉ liệt kê mã BR IDs từ ma trận 115 BR.
- Khớp 100% với Code, Sequence Diagram và Class Diagram.
```
