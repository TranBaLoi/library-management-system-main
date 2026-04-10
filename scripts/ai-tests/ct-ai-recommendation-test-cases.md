 # Ma trận test case theo CT‑AI — Recommendation (Gorse)

 Ngày: 2026-04-06
 Người chịu trách nhiệm: QA dự án / bạn
 Mục đích: Thiết kế các test case cho hệ thống đề xuất (recommendation) theo hướng dẫn CT‑AI (ISTQB CT‑AI).

 ---

 **Cách sử dụng**
 - Khung đánh giá tự động: xem [scripts/test-recommendation.ts](scripts/test-recommendation.ts)
 - Đặt ground-truth và recommendation mô phỏng trong `scripts/test-data/` (đã có mẫu sẵn).

 ---

 ## Tổng quan các hạng mục (theo các mảng CT‑AI)
 - Chức năng / Độ chính xác: Precision@K, Recall@K, NDCG, MRR (CT‑AI: Functional correctness / Performance)
 - Chất lượng dữ liệu & pipeline: sync, labels, cold‑start (CT‑AI: Data validation)
 - Độ bền & Khả năng chịu lỗi: lỗi dịch vụ, rate limit, timeout (CT‑AI: Robustness)
 - Bảo mật & Quyền riêng tư: rò rỉ PII, prompt injection (CT‑AI: Security/Privacy)
 - Công bằng & Thiên lệch: exposure parity, popularity bias (CT‑AI: Fairness)
 - Giải thích được (Explainability): lý do được đề xuất, nguồn gốc (CT‑AI: Explainability)
 - Giám sát & Drift: drift chỉ số, logging (CT‑AI: Monitoring/Governance)

 ---

 ## Ma trận test case (tóm tắt)

 - **TC-FUNC-01 — Precision/Recall/NDCG (offline)**
   - Mục tiêu: Đo chất lượng đề xuất so với ground-truth.
   - Tiền điều kiện: Có `ground-truth` (user → sách liên quan) và danh sách đề xuất (từ Gorse hoặc mô phỏng).
   - Các bước: Chạy `scripts/test-recommendation.ts` trên tập ground truth.
   - Kỳ vọng: Báo cáo Precision@K, Recall@K, NDCG@K, MRR; so sánh với ngưỡng baseline.
   - Chỉ số: Precision@K, Recall@K, NDCG@K, MRR, Coverage.
   - Tự động hoá: Có — khung đã sẵn sàng.
   - Ưu tiên: Cao

 - **TC-FUNC-02 — End‑to‑end mapping & bảo toàn thứ tự (API)**
   - Mục tiêu: Kiểm tra `/api/recommendations` trả về `BookWithAuthor[]` với thứ tự đúng và mapping ID → book.
   - Tiền điều kiện: Gorse đã được seed với mapping biết trước (dùng `scripts/sync-gorse-data.ts` hoặc `mock-gorse-feedback.ts`).
   - Các bước: Seed dữ liệu → gọi `GET /api/recommendations` (có xác thực) → kiểm tra thứ tự và tồn tại của từng sách trong DB.
   - Kỳ vọng: Các item trả về map đúng `book_{id}` → bản ghi DB; thứ tự được giữ nguyên.
   - Tự động hoá: Có (integration test).
   - Ưu tiên: Cao

 - **TC-FUNC-03 — Hành vi fallback khi recommender trả rỗng**
   - Mục tiêu: Khi Gorse trả về rỗng hoặc lỗi, ứng dụng phải fallback (popular/latest) hoặc trả mảng rỗng theo spec.
   - Các bước: Giả lập Gorse trả 404 hoặc rỗng → gọi `/api/recommendations`.
   - Kỳ vọng: Ứng dụng trả fallback list (popular/latest) hoặc mảng rỗng (theo quy định sản phẩm).
   - Tự động hoá: Có
   - Ưu tiên: Cao

 - **TC-DATA-01 — Độ chính xác khi sync & tính toàn vẹn labels**
   - Mục tiêu: Đảm bảo `scripts/sync-gorse-data.ts` / `GorseService.createItemPayload` tạo labels/categories đúng.
   - Các bước: Tạo sách mẫu trong DB có author/categories/interest rõ ràng → chạy sync → truy vấn Gorse DB/API để kiểm tra labels.
   - Kỳ vọng: Labels được làm sạch (sanitized), categories tồn tại, không lỗi parse JSON.
   - Tự động hoá: Có (fixture DB + assert query).
   - Ưu tiên: Cao

 - **TC-DATA-02 — Cold‑start (người dùng và item mới)**
   - Mục tiêu: Người dùng mới (không có feedback) nhận đề xuất hợp lý (popular hoặc content‑based).
   - Các bước: Tạo người dùng mới → gọi `/api/recommendations` → ghi lại kết quả.
   - Kỳ vọng: Danh sách trả về không rỗng và hợp lý (popular hoặc theo chuyên mục); đo novelty/coverage.
   - Tự động hoá: Có
   - Ưu tiên: Cao

 - **TC-ROB-01 — Lỗi dịch vụ embedding / hành vi fallback**
   - Mục tiêu: Khi `ollama`/embedding service gặp lỗi, hệ thống xử lý mềm dẻo (retry/log/fallback).
   - Các bước: Dừng Ollama hoặc giả lập lỗi → gọi đường dẫn embedding (tìm kiếm hoặc batch) hoặc chạy demo → quan sát hành vi.
   - Kỳ vọng: Lỗi được xử lý, app không bị crash, dùng fallback (ví dụ: similarity dựa trên metadata) hoặc trả kết quả rỗng kèm log lỗi.
   - Chỉ số: Tỷ lệ lỗi, % lần gọi dùng fallback.
   - Tự động hoá: Một phần (cần bật/tắt dịch vụ).
   - Ưu tiên: Cao

 - **TC-ROB-02 — Rate limit / timeout / retry logic**
   - Mục tiêu: Đánh giá cơ chế retry và timeout khi Gorse/OpenAI/Gemini bị chậm hoặc bị rate-limit.
   - Các bước: Inject độ trễ qua proxy hoặc mock (slow responses); kiểm tra retry/backoff và độ trễ hiển thị cho người dùng.
   - Kỳ vọng: Retry có giới hạn; độ trễ người dùng nằm trong SLA hoặc có sự degrade mềm mượt.
   - Tự động hoá: Có (với mock hoặc proxy).
   - Ưu tiên: Trung bình

 - **TC-POISON-01 — Phát hiện data poisoning**
   - Mục tiêu: Kiểm tra độ bền khi có lượng lớn feedback giả (spam) làm sai lệch đề xuất.
   - Các bước: Chèn nhiều feedback giả có giá trị cao cho một vài item → chạy đánh giá offline và kiểm tra recs online.
   - Kỳ vọng: Phát hiện được sự skew đột ngột; có cảnh báo giám sát; chất lượng đề xuất giảm.
   - Tự động hoá: Có (script mock feedback đã có).
   - Ưu tiên: Trung bình

 - **TC-FAIR-01 — Công bằng (exposure parity giữa các nhóm)**
   - Mục tiêu: Kiểm tra tỷ lệ hiển thị sách giữa các nhóm (ví dụ: ngôn ngữ, thể loại, tác giả) không chênh lệch quá lớn.
   - Các bước: Định nghĩa các cohort người dùng, chạy recs, tính phân bố exposure.
   - Kỳ vọng: Phân bố nằm trong ngưỡng chấp nhận được (cấu hình được).
   - Chỉ số: KL‑divergence, disparate impact ratio.
   - Tự động hoá: Có
   - Ưu tiên: Trung bình

 - **TC-EXP-01 — Giải thích / provenance**
   - Mục tiêu: Với mỗi item, UI/endpoint có khả năng trả lời “tại sao” (labels, tín hiệu chính).
   - Các bước: Gọi API explain hoặc lấy metadata/log cho các item được đề xuất.
   - Kỳ vọng: Giải thích tồn tại và nhất quán (ví dụ: trùng labels hoặc interests của user).
   - Tự động hoá: Một phần
   - Ưu tiên: Trung bình

 - **TC-PRIV-01 — Rò rỉ PII trong embeddings/logs**
   - Mục tiêu: Đảm bảo các trường nhạy cảm không xuất hiện trong logs, prompts, hoặc trả về qua API.
   - Các bước: Thêm dữ liệu PII giả vào profile/reviews → chạy embedding/generation → quét logs và responses.
   - Kỳ vọng: Không có PII trong outputs hoặc logs; embeddings được lưu trữ an toàn.
   - Tự động hoá: Một phần (cần quét log).
   - Ưu tiên: Cao

 - **TC-SEC-01 — Prompt injection & rò rỉ chỉ thị**
   - Mục tiêu: Thử tấn công prompt injection qua nội dung user (reviews/description) để xem LLM có rò rỉ secret hay không.
   - Các bước: Đưa payload injection vào comment/description → gọi endpoint summary/generation → đánh giá phản hồi.
   - Kỳ vọng: Không có thông tin nhạy cảm bị rò rỉ; hệ thống bỏ qua/escape các chỉ thị độc hại.
   - Ưu tiên: Cao

 - **TC-PERF-01 — SLA độ trễ (P95/P99)**
   - Mục tiêu: Đo thời gian phản hồi của `/api/recommendations` dưới tải.
   - Các bước: Chạy load test (k6/jmeter) với lưu lượng thực tế; đo các percentiles.
   - Kỳ vọng: P95 < X ms (cần điều chỉnh theo hạ tầng).
   - Tự động hoá: Có
   - Ưu tiên: Cao

 - **TC-MON-01 — Phát hiện drift & cảnh báo tự động**
   - Mục tiêu: Thiết lập baseline cho các chỉ số và phát hiện khi Precision@K giảm > X%.
   - Các bước: Chạy đánh giá offline hàng đêm; so sánh với baseline; phát cảnh báo nếu vượt ngưỡng.
   - Kỳ vọng: Tạo cảnh báo; khởi tạo điều tra nguyên nhân.
   - Tự động hoá: Có
   - Ưu tiên: Cao

 - **TC-CI-01 — Job regression (gating bằng metrics)**
   - Mục tiêu: Thêm job CI chạy `scripts/test-recommendation.ts` trên ground-truth mẫu; fail CI nếu metrics giảm dưới ngưỡng.
   - Các bước: Thêm job pipeline chạy harness và kiểm tra Precision@K >= baseline*0.9.
   - Kỳ vọng: PR bị chặn nếu phát hiện regression.
   - Tự động hoá: Có
   - Ưu tiên: Cao

 ---

 ## Ngưỡng chấp nhận đề xuất (ví dụ)
 - Precision@5: so với baseline (chọn baseline từ dữ liệu lịch sử) — block nếu < 80% của baseline
 - NDCG@5 / MRR: tương tự, dùng ngưỡng tương đối
 - Latency: P95 < 300ms (cần điều chỉnh theo hạ tầng)

 > Lưu ý: Ngưỡng phụ thuộc vào dữ liệu và ưu tiên sản phẩm — hãy thu baseline trên dữ liệu thực trước khi cố định ngưỡng.

 ---

 ## Hành động tiếp theo (khuyến nghị)
 1. Chọn 3 test ưu tiên để tự động hoá trước: `TC-FUNC-01`, `TC-FUNC-02`, `TC-PERF-01`.
 2. Mở rộng `scripts/test-data/` với ground-truth thực tế (xuất từ lịch sử borrow/like/borrowRequest).
 3. Thêm job CI để chạy `scripts/test-recommendation.ts` theo chu kỳ (nightly) và/hoặc trên PR.

 ---

 Tài liệu tham khảo: Checklist CT‑AI (các chủ đề: functional, data, robustness, security, fairness, explainability, monitoring).
