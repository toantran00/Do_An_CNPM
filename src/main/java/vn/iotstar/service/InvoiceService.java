package vn.iotstar.service;

import vn.iotstar.entity.DatHang;
import java.io.ByteArrayInputStream;

public interface InvoiceService {
    ByteArrayInputStream generateInvoicePdf(DatHang datHang);
}