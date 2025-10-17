package vn.iotstar.service.impl;

import com.itextpdf.text.*;
import com.itextpdf.text.pdf.*;
import com.itextpdf.text.pdf.draw.LineSeparator;
import org.springframework.stereotype.Service;
import vn.iotstar.entity.*;
import vn.iotstar.service.InvoiceService;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.Locale;

@Service
public class InvoiceServiceImpl implements InvoiceService {

    // Màu sắc theme hiện đại
    private static final BaseColor PRIMARY_COLOR = new BaseColor(79, 70, 229); // Indigo
    private static final BaseColor SECONDARY_COLOR = new BaseColor(241, 245, 249); // Light gray
    private static final BaseColor SUCCESS_COLOR = new BaseColor(16, 185, 129); // Green
    private static final BaseColor WARNING_COLOR = new BaseColor(245, 158, 11); // Amber
    private static final BaseColor DANGER_COLOR = new BaseColor(239, 68, 68); // Red
    private static final BaseColor TEXT_PRIMARY = new BaseColor(15, 23, 42); // Slate
    private static final BaseColor TEXT_SECONDARY = new BaseColor(100, 116, 139); // Slate light
    private static final BaseColor WHITE = BaseColor.WHITE;
    private static final BaseColor BORDER_COLOR = new BaseColor(226, 232, 240);

    // Font cho tiếng Việt
    private Font fontNormal;
    private Font fontBold;
    private Font fontTitle;
    private Font fontSubtitle;
    private Font fontSmall;
    private Font fontHeader;

    @Override
    public ByteArrayInputStream generateInvoicePdf(DatHang datHang) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            
            // Tạo document với margins đẹp hơn
            Document document = new Document(PageSize.A4, 40, 40, 40, 40);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            document.open();
            
            // Setup font tiếng Việt
            setupVietnameseFonts();
            
            // Định dạng số tiền và ngày tháng
            NumberFormat currencyFormat = NumberFormat.getInstance(new Locale("vi", "VN"));
            SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm");

            // ========== HEADER - Logo & Invoice Title ==========
            addModernHeader(document, datHang, dateFormat);
            
            // Separator line
            addSeparatorLine(document, PRIMARY_COLOR, 2f);
            document.add(new Paragraph(" ", fontSmall)); // Small spacing

            // ========== STORE & CUSTOMER INFO - 2 Columns ==========
            addInfoSection(document, datHang);
            
            document.add(new Paragraph(" ", fontSmall));

            // ========== ORDER ITEMS TABLE ==========
            addModernTable(document, datHang, currencyFormat);
            
            // ========== SUMMARY BOX ==========
            addSummaryBox(document, datHang, currencyFormat);
            
            document.add(new Paragraph(" ", fontSmall));
            document.add(new Paragraph(" ", fontSmall));

            // ========== FOOTER ==========
            addModernFooter(document);

            document.close();
            return new ByteArrayInputStream(out.toByteArray());
            
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Lỗi tạo hóa đơn: " + e.getMessage(), e);
        }
    }

    private void setupVietnameseFonts() {
        try {
            // Thử sử dụng font hệ thống Windows hỗ trợ tiếng Việt tốt
            String[] fontPaths = {
                "c:/windows/fonts/arial.ttf",
                "c:/windows/fonts/times.ttf",
                "C:/Windows/Fonts/Arial.ttf",
                "C:/Windows/Fonts/times.ttf"
            };
            
            BaseFont baseFont = null;
            for (String fontPath : fontPaths) {
                try {
                    baseFont = BaseFont.createFont(fontPath, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
                    System.out.println("Đã tải font từ: " + fontPath);
                    break;
                } catch (Exception e) {
                    // Thử font tiếp theo
                }
            }
            
            // Nếu không tìm thấy font hệ thống, dùng Helvetica với encoding Unicode
            if (baseFont == null) {
                baseFont = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
                System.out.println("Sử dụng font Helvetica với Unicode");
            }
            
            // Tạo các font styles
            fontNormal = new Font(baseFont, 10, Font.NORMAL, TEXT_PRIMARY);
            fontBold = new Font(baseFont, 10, Font.BOLD, TEXT_PRIMARY);
            fontTitle = new Font(baseFont, 16, Font.BOLD, PRIMARY_COLOR);
            fontSubtitle = new Font(baseFont, 12, Font.BOLD, TEXT_PRIMARY);
            fontSmall = new Font(baseFont, 8, Font.NORMAL, TEXT_SECONDARY);
            fontHeader = new Font(baseFont, 24, Font.BOLD, WHITE);
            
        } catch (Exception e) {
            // Fallback sang font mặc định
            System.err.println("Không tải được font, sử dụng font mặc định: " + e.getMessage());
            fontNormal = new Font(Font.FontFamily.HELVETICA, 10, Font.NORMAL, TEXT_PRIMARY);
            fontBold = new Font(Font.FontFamily.HELVETICA, 10, Font.BOLD, TEXT_PRIMARY);
            fontTitle = new Font(Font.FontFamily.HELVETICA, 16, Font.BOLD, PRIMARY_COLOR);
            fontSubtitle = new Font(Font.FontFamily.HELVETICA, 12, Font.BOLD, TEXT_PRIMARY);
            fontSmall = new Font(Font.FontFamily.HELVETICA, 8, Font.NORMAL, TEXT_SECONDARY);
            fontHeader = new Font(Font.FontFamily.HELVETICA, 24, Font.BOLD, WHITE);
        }
    }

    private void addModernHeader(Document document, DatHang datHang, SimpleDateFormat dateFormat) throws DocumentException {
        PdfPTable headerTable = new PdfPTable(1);
        headerTable.setWidthPercentage(100);
        headerTable.setSpacingAfter(15f);

        PdfPCell headerCell = new PdfPCell();
        headerCell.setBackgroundColor(PRIMARY_COLOR);
        headerCell.setBorder(Rectangle.NO_BORDER);
        headerCell.setPadding(25f);
        headerCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        
        // Icon và tiêu đề
        Paragraph title = new Paragraph("HÓA ĐƠN BÁN HÀNG", fontHeader);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(10f);
        
        // Mã đơn hàng với style đẹp
        Font codeFont = new Font(fontBold.getBaseFont(), 13, Font.NORMAL, WHITE);
        Paragraph orderCode = new Paragraph("Mã đơn hàng: #" + datHang.getMaDatHang(), codeFont);
        orderCode.setAlignment(Element.ALIGN_CENTER);
        orderCode.setSpacingAfter(5f);
        
        // Ngày đặt hàng - chuyển đổi LocalDate sang Date
        Font dateFont = new Font(fontSmall.getBaseFont(), 10, Font.NORMAL, WHITE);
        String ngayDat;
        if (datHang.getNgayDat() != null) {
            Date date = Date.from(datHang.getNgayDat().atStartOfDay(ZoneId.systemDefault()).toInstant());
            ngayDat = dateFormat.format(date);
        } else {
            ngayDat = dateFormat.format(new Date());
        }
        Paragraph orderDate = new Paragraph("Ngày đặt: " + ngayDat, dateFont);
        orderDate.setAlignment(Element.ALIGN_CENTER);
        
        headerCell.addElement(title);
        headerCell.addElement(orderCode);
        headerCell.addElement(orderDate);
        headerTable.addCell(headerCell);
        
        document.add(headerTable);
    }

    private void addSeparatorLine(Document document, BaseColor color, float thickness) throws DocumentException {
        LineSeparator line = new LineSeparator();
        line.setLineColor(color);
        line.setLineWidth(thickness);
        document.add(new Chunk(line));
    }

    private void addInfoSection(Document document, DatHang datHang) throws DocumentException {
        CuaHang cuaHang = getStoreFromOrder(datHang);
        
        // Tạo table 2 cột cho Store Info và Customer Info
        PdfPTable infoTable = new PdfPTable(2);
        infoTable.setWidthPercentage(100);
        infoTable.setWidths(new float[]{1, 1});
        infoTable.setSpacingAfter(15f);

        // ===== STORE INFO (Left Column) =====
        PdfPCell storeCell = new PdfPCell();
        storeCell.setBorder(Rectangle.NO_BORDER);
        storeCell.setPadding(10f);
        storeCell.setBackgroundColor(SECONDARY_COLOR);
        
        Paragraph storeTitle = new Paragraph("THÔNG TIN CỬA HÀNG", fontSubtitle);
        storeTitle.setSpacingAfter(10f);
        storeCell.addElement(storeTitle);
        
        if (cuaHang != null) {
            addInfoLine(storeCell, "Tên cửa hàng:", cuaHang.getTenCuaHang());
            addInfoLine(storeCell, "Địa chỉ:", cuaHang.getDiaChi());
            addInfoLine(storeCell, "Điện thoại:", cuaHang.getSoDienThoai());
            addInfoLine(storeCell, "Email:", cuaHang.getEmail());
            
            if (cuaHang.getDanhGiaTrungBinh() != null && cuaHang.getDanhGiaTrungBinh() > 0) {
                String rating = String.format("%.1f/5.0 (%d đánh giá)", 
                    cuaHang.getDanhGiaTrungBinh(), cuaHang.getSoLuongDanhGia());
                addInfoLine(storeCell, "Đánh giá:", rating);
            }
        }
        
        infoTable.addCell(storeCell);

        // ===== CUSTOMER INFO (Right Column) =====
        PdfPCell customerCell = new PdfPCell();
        customerCell.setBorder(Rectangle.NO_BORDER);
        customerCell.setPadding(10f);
        customerCell.setBackgroundColor(new BaseColor(254, 249, 195)); // Light yellow
        
        Paragraph customerTitle = new Paragraph("THÔNG TIN KHÁCH HÀNG", fontSubtitle);
        customerTitle.setSpacingAfter(10f);
        customerCell.addElement(customerTitle);
        
        addInfoLine(customerCell, "Họ tên:", datHang.getNguoiDung().getTenNguoiDung());
        addInfoLine(customerCell, "Địa chỉ:", datHang.getDiaChiGiaoHang());
        addInfoLine(customerCell, "Điện thoại:", datHang.getSoDienThoaiGiaoHang());
        
        // Trạng thái với màu sắc
        BaseColor statusColor = getStatusColor(datHang.getTrangThai());
        Font statusFont = new Font(fontBold.getBaseFont(), 10, Font.BOLD, statusColor);
        Paragraph statusPara = new Paragraph();
        statusPara.add(new Chunk("Trạng thái: ", fontBold));
        statusPara.add(new Chunk(datHang.getTrangThai(), statusFont));
        statusPara.setSpacingBefore(5f);
        customerCell.addElement(statusPara);
        
        if (datHang.getGhiChu() != null && !datHang.getGhiChu().trim().isEmpty()) {
            addInfoLine(customerCell, "Ghi chú:", datHang.getGhiChu());
        }
        
        infoTable.addCell(customerCell);
        
        document.add(infoTable);
    }

    private void addInfoLine(PdfPCell cell, String label, String value) {
        Paragraph line = new Paragraph();
        line.add(new Chunk(label + " ", fontBold));
        line.add(new Chunk(value, fontNormal));
        line.setSpacingAfter(4f);
        cell.addElement(line);
    }

    private void addModernTable(Document document, DatHang datHang, NumberFormat currencyFormat) throws DocumentException {
        // Tiêu đề bảng
        Paragraph tableTitle = new Paragraph("CHI TIẾT ĐƠN HÀNG", fontSubtitle);
        tableTitle.setSpacingAfter(10f);
        document.add(tableTitle);

        // Tạo bảng với 5 cột
        PdfPTable table = new PdfPTable(new float[]{0.8f, 3.5f, 1.5f, 1f, 1.8f});
        table.setWidthPercentage(100);
        table.setSpacingBefore(5f);
        table.setSpacingAfter(15f);

        // Header bảng với styling đẹp
        String[] headers = {"STT", "Sản phẩm", "Đơn giá", "SL", "Thành tiền"};
        
        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, new Font(fontBold.getBaseFont(), 10, Font.BOLD, WHITE)));
            cell.setBackgroundColor(PRIMARY_COLOR);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setPadding(10f);
            cell.setBorder(Rectangle.NO_BORDER);
            table.addCell(cell);
        }

        // Dữ liệu sản phẩm với alternating colors
        int stt = 1;
        boolean alternate = false;
        
        for (DatHangChiTiet detail : datHang.getDatHangChiTiets()) {
            BaseColor rowColor = alternate ? SECONDARY_COLOR : WHITE;
            
            // STT
            addStyledCell(table, String.valueOf(stt++), Element.ALIGN_CENTER, rowColor);
            
            // Tên sản phẩm (wrap text)
            addStyledCell(table, detail.getSanPham().getTenSanPham(), Element.ALIGN_LEFT, rowColor);
            
            // Đơn giá
            String donGia = currencyFormat.format(detail.getGiaBan()) + " đ";
            addStyledCell(table, donGia, Element.ALIGN_RIGHT, rowColor);
            
            // Số lượng
            addStyledCell(table, String.valueOf(detail.getSoLuong()), Element.ALIGN_CENTER, rowColor);
            
            // Thành tiền
            String thanhTien = currencyFormat.format(detail.getThanhTien()) + " đ";
            addStyledCell(table, thanhTien, Element.ALIGN_RIGHT, rowColor);
            
            alternate = !alternate;
        }

        document.add(table);
    }

    private void addStyledCell(PdfPTable table, String content, int alignment, BaseColor bgColor) {
        PdfPCell cell = new PdfPCell(new Phrase(content, fontNormal));
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(8f);
        cell.setBackgroundColor(bgColor);
        cell.setBorderColor(BORDER_COLOR);
        cell.setBorderWidth(0.5f);
        table.addCell(cell);
    }

    private void addSummaryBox(Document document, DatHang datHang, NumberFormat currencyFormat) throws DocumentException {
        // Tạo box tổng tiền với styling nổi bật
        PdfPTable summaryTable = new PdfPTable(2);
        summaryTable.setWidthPercentage(100);
        summaryTable.setWidths(new float[]{3, 1});
        summaryTable.setSpacingAfter(10f);

        // Empty cell bên trái
        PdfPCell emptyCell = new PdfPCell();
        emptyCell.setBorder(Rectangle.NO_BORDER);
        summaryTable.addCell(emptyCell);

        // Summary box bên phải
        PdfPCell summaryCell = new PdfPCell();
        summaryCell.setBorder(Rectangle.BOX);
        summaryCell.setBorderColor(SUCCESS_COLOR);
        summaryCell.setBorderWidth(2f);
        summaryCell.setBackgroundColor(new BaseColor(236, 253, 245)); // Light green
        summaryCell.setPadding(15f);

        // Label
        Paragraph totalLabel = new Paragraph("TỔNG CỘNG", new Font(fontBold.getBaseFont(), 12, Font.BOLD, TEXT_PRIMARY));
        totalLabel.setAlignment(Element.ALIGN_CENTER);
        totalLabel.setSpacingAfter(8f);
        summaryCell.addElement(totalLabel);

        // Amount
        String totalAmount = currencyFormat.format(datHang.getTongTien()) + " đ";
        Paragraph totalValue = new Paragraph(totalAmount, new Font(fontBold.getBaseFont(), 18, Font.BOLD, SUCCESS_COLOR));
        totalValue.setAlignment(Element.ALIGN_CENTER);
        summaryCell.addElement(totalValue);

        summaryTable.addCell(summaryCell);
        document.add(summaryTable);
    }

    private void addModernFooter(Document document) throws DocumentException {
        // Separator line trước footer
        addSeparatorLine(document, BORDER_COLOR, 1f);
        document.add(new Paragraph(" ", fontSmall));

        // Thank you message
        Paragraph thankYou = new Paragraph("Cảm ơn quý khách đã mua hàng!", 
                                         new Font(fontBold.getBaseFont(), 13, Font.BOLD, PRIMARY_COLOR));
        thankYou.setAlignment(Element.ALIGN_CENTER);
        thankYou.setSpacingAfter(8f);
        document.add(thankYou);

        // Support info
        Paragraph support = new Paragraph("Mọi thắc mắc vui lòng liên hệ hotline: 0378240915", 
                                        new Font(fontNormal.getBaseFont(), 9, Font.NORMAL, TEXT_SECONDARY));
        support.setAlignment(Element.ALIGN_CENTER);
        support.setSpacingAfter(5f);
        document.add(support);

        // Website
        Paragraph website = new Paragraph("www.petshop.vn | Email: support@petshop.vn", 
                                        new Font(fontSmall.getBaseFont(), 9, Font.ITALIC, TEXT_SECONDARY));
        website.setAlignment(Element.ALIGN_CENTER);
        website.setSpacingAfter(10f);
        document.add(website);

        // Footer note
        Paragraph note = new Paragraph("Hóa đơn này được tạo tự động bởi hệ thống", fontSmall);
        note.setAlignment(Element.ALIGN_CENTER);
        document.add(note);
    }

    private BaseColor getStatusColor(String status) {
        if (status == null) return TEXT_PRIMARY;
        
        switch (status) {
            case "Hoàn thành":
                return SUCCESS_COLOR;
            case "Đang giao":
            case "Đang xử lý":
                return WARNING_COLOR;
            case "Hủy":
                return DANGER_COLOR;
            default:
                return PRIMARY_COLOR;
        }
    }

    private CuaHang getStoreFromOrder(DatHang datHang) {
        if (datHang.getDatHangChiTiets() != null && !datHang.getDatHangChiTiets().isEmpty()) {
            return datHang.getDatHangChiTiets().get(0).getSanPham().getCuaHang();
        }
        return null;
    }
}
