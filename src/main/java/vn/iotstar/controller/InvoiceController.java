package vn.iotstar.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import vn.iotstar.entity.DatHang;
import vn.iotstar.entity.NguoiDung;
import vn.iotstar.service.DatHangService;
import vn.iotstar.service.NguoiDungService;
import vn.iotstar.service.UserDetailsImpl;
import vn.iotstar.service.InvoiceService;

import java.io.ByteArrayInputStream;

@Controller
@RequestMapping("/api/orders")
public class InvoiceController {

    @Autowired
    private DatHangService datHangService;

    @Autowired
    private NguoiDungService nguoiDungService;

    @Autowired
    private InvoiceService invoiceService;

    @GetMapping("/{orderId}/invoice")
    public ResponseEntity<InputStreamResource> generateInvoice(@PathVariable Integer orderId) {
        try {
            // Kiểm tra đăng nhập
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated() || 
                authentication.getPrincipal().equals("anonymousUser")) {
                return ResponseEntity.status(401).build();
            }

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            String email = userDetails.getUsername();

            NguoiDung nguoiDung = nguoiDungService.getUserByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

            // Lấy đơn hàng
            DatHang datHang = datHangService.findByMaDatHang(orderId);
            if (datHang == null) {
                return ResponseEntity.notFound().build();
            }

            // Kiểm tra quyền sở hữu
            if (!datHang.getNguoiDung().getMaNguoiDung().equals(nguoiDung.getMaNguoiDung())) {
                return ResponseEntity.status(403).build();
            }

            // Tạo PDF
            ByteArrayInputStream bis = invoiceService.generateInvoicePdf(datHang);

            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Disposition", "inline; filename=invoice-" + orderId + ".pdf");

            return ResponseEntity.ok()
                    .headers(headers)
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(new InputStreamResource(bis));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }
}