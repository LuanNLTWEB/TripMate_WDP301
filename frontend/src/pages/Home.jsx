import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

function Home() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="py-5 bg-light">
          <div className="container">
            <div className="row justify-content-center text-center">
              <div className="col-lg-8">
                <h6 className="text-uppercase text-muted small fw-bold mb-3">Du lịch thông minh hơn. Du lịch theo cách của bạn.</h6>
                <h1 className="display-4 fw-bold mb-3">Lên kế hoạch cho chuyến đi hoàn hảo cùng TripMate</h1>
                <p className="lead text-muted mb-4">Tự tạo lịch trình của riêng bạn hoặc khám phá các tour du lịch có sẵn cùng TripMate.</p>
                <div className="d-flex gap-3 justify-content-center flex-wrap">
                  <button className="btn btn-primary btn-lg px-4">Lên kế hoạch ngay</button>
                  <button className="btn btn-outline-primary btn-lg px-4">Khám phá Tour</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Search / Planning Section */}
        <section className="py-5">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-10">
                <div className="card shadow-sm border-0">
                  <div className="card-body p-4 p-md-5">
                    <h3 className="fw-bold mb-4 text-center">Bắt đầu lên kế hoạch cho chuyến đi của bạn</h3>
                    <form>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label htmlFor="destination" className="form-label fw-medium">Điểm đến</label>
                          <input
                            type="text"
                            className="form-control"
                            id="destination"
                            placeholder="Bạn muốn đi đâu?"
                          />
                        </div>
                        <div className="col-md-3">
                          <label htmlFor="startDate" className="form-label fw-medium">Ngày bắt đầu</label>
                          <input type="date" className="form-control" id="startDate" />
                        </div>
                        <div className="col-md-3">
                          <label htmlFor="endDate" className="form-label fw-medium">Ngày kết thúc</label>
                          <input type="date" className="form-control" id="endDate" />
                        </div>
                        <div className="col-md-4">
                          <label htmlFor="budget" className="form-label fw-medium">Ngân sách dự kiến</label>
                          <div className="input-group">
                            <span className="input-group-text">$</span>
                            <input
                              type="number"
                              className="form-control"
                              id="budget"
                              placeholder="Ngân sách (USD)"
                              min="0"
                              step="100"
                            />
                          </div>
                        </div>
                        <div className="col-md-4">
                          <label htmlFor="travelStyle" className="form-label fw-medium">Phong cách du lịch</label>
                          <select className="form-select" id="travelStyle" defaultValue="">
                            <option value="" disabled>Chọn phong cách du lịch</option>
                            <option value="nature">Thiên nhiên</option>
                            <option value="food">Ẩm thực</option>
                            <option value="culture">Văn hóa</option>
                            <option value="adventure">Phiêu lưu</option>
                            <option value="relaxation">Nghỉ dưỡng</option>
                          </select>
                        </div>
                        <div className="col-md-4 d-flex align-items-end">
                          <button type="submit" className="btn btn-primary w-100">Tìm kiếm / Bắt đầu lên lịch</button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Travel Options Section */}
        <section className="py-5 bg-light">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="fw-bold">Bạn muốn du lịch theo cách nào?</h2>
            </div>
            <div className="row g-4 justify-content-center">
              <div className="col-md-6 col-lg-5">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body p-4 text-center">
                    <h4 className="fw-bold mb-3">Tự lên lịch trình của bạn</h4>
                    <p className="text-muted mb-4">Tự do tạo lịch trình và lên kế hoạch chuyến đi theo sở thích của riêng bạn.</p>
                    <button className="btn btn-primary">Bắt đầu lên kế hoạch</button>
                  </div>
                </div>
              </div>
              <div className="col-md-6 col-lg-5">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body p-4 text-center">
                    <h4 className="fw-bold mb-3">Đặt Tour có sẵn</h4>
                    <p className="text-muted mb-4">Khám phá các tour du lịch với lịch trình và trải nghiệm được chuẩn bị sẵn.</p>
                    <button className="btn btn-outline-primary">Khám phá Tour</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why TripMate Section */}
        <section className="py-5">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="fw-bold">Tại sao chọn TripMate?</h2>
            </div>
            <div className="row g-4">
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card h-100 border-0 shadow-sm text-center p-4">
                  <div className="card-body">
                    <h5 className="fw-bold mb-2">Lên kế hoạch thông minh</h5>
                    <p className="text-muted small mb-0">Lên kế hoạch chuyến đi đơn giản, dễ dàng và thông minh.</p>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card h-100 border-0 shadow-sm text-center p-4">
                  <div className="card-body">
                    <h5 className="fw-bold mb-2">Lịch trình linh hoạt</h5>
                    <p className="text-muted small mb-0">Tạo và tùy chỉnh lịch trình cá nhân hóa theo ý muốn của bạn.</p>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card h-100 border-0 shadow-sm text-center p-4">
                  <div className="card-body">
                    <h5 className="fw-bold mb-2">Tour trọn gói có sẵn</h5>
                    <p className="text-muted small mb-0">Khám phá các chuyến đi với lịch trình chuẩn từ các nhà cung cấp uy tín.</p>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card h-100 border-0 shadow-sm text-center p-4">
                  <div className="card-body">
                    <h5 className="fw-bold mb-2">Lên kế hoạch cùng nhau</h5>
                    <p className="text-muted small mb-0">Chia sẻ lịch trình cá nhân và cùng bạn bè lên kế hoạch chuyến đi.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

export default Home