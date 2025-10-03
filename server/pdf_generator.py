import os
import locale
from weasyprint import HTML
from flask import render_template
from datetime import datetime
import config

# Coba atur locale ke Bahasa Indonesia agar nama bulan menjadi Bahasa Indonesia
try:
    locale.setlocale(locale.LC_TIME, 'id_ID.UTF-8')
except locale.Error:
    try:
        locale.setlocale(locale.LC_TIME, 'Indonesian_Indonesia.1252')
    except locale.Error:
        print("Peringatan: Locale Bahasa Indonesia tidak ditemukan. Nama bulan akan dalam Bahasa Inggris.")

def get_nama_lengkap_by_email(google_provider, email):
    if not email: return ""
    try:
        cabang_sheet = google_provider.sheet.worksheet(config.CABANG_SHEET_NAME)
        records = cabang_sheet.get_all_records()
        for record in records:
            if str(record.get('EMAIL_SAT', '')).strip().lower() == str(email).strip().lower():
                return record.get('NAMA LENGKAP', '').strip()
    except Exception as e:
        print(f"Error getting name for email {email}: {e}")
    return ""

def format_rupiah(number):
    try:
        num = float(number)
        return f"{num:,.0f}".replace(",", ".")
    except (ValueError, TypeError):
        return "0"

def parse_flexible_timestamp(ts_string):
    """Membaca berbagai format timestamp dan mengembalikannya sebagai objek datetime."""
    if not ts_string or not isinstance(ts_string, str):
        return None

    try:
        return datetime.fromisoformat(ts_string)
    except (ValueError, TypeError):
        pass

    possible_formats = [
        '%m/%d/%Y %H:%M:%S',
        '%Y-%m-%d %H:%M:%S',
    ]
    for fmt in possible_formats:
        try:
            return datetime.strptime(ts_string, fmt)
        except (ValueError, TypeError):
            continue
    
    return None

def create_approval_details_block(google_provider, approver_email, approval_time_str):
    approver_name = get_nama_lengkap_by_email(google_provider, approver_email)
    
    approval_dt = parse_flexible_timestamp(approval_time_str)

    if approval_dt:
        formatted_time = approval_dt.strftime('%d %B %Y, %H:%M WIB')
    else:
        formatted_time = "Waktu tidak tersedia"
        
    name_display = f"<strong>{approver_name}</strong><br>" if approver_name else ""
    return f"""
    <div class="approval-details">
        {name_display}
        {approver_email or ''}<br>
        Pada: {formatted_time}
    </div>
    """

def create_pdf_from_data(google_provider, form_data, exclude_sbo=False):
    grouped_items = {}
    grand_total = 0
    
    items_from_form = {}
    for key, value in form_data.items():
        if key.startswith("Jenis_Pekerjaan_"):
            index = key.split('_')[-1]
            if index not in items_from_form: items_from_form[index] = {}
            items_from_form[index]['jenisPekerjaan'] = value
        elif key.startswith("Kategori_Pekerjaan_"):
            index = key.split('_')[-1]
            if index not in items_from_form: items_from_form[index] = {}
            items_from_form[index]['kategori'] = value
        elif key.startswith("Satuan_Item_"):
            index = key.split('_')[-1]
            if index not in items_from_form: items_from_form[index] = {}
            items_from_form[index]['satuan'] = value
        elif key.startswith("Volume_Item_"):
            index = key.split('_')[-1]
            if index not in items_from_form: items_from_form[index] = {}
            items_from_form[index]['volume'] = float(value or 0)
        elif key.startswith("Harga_Material_Item_"):
            index = key.split('_')[-1]
            if index not in items_from_form: items_from_form[index] = {}
            items_from_form[index]['hargaMaterial'] = value
        elif key.startswith("Harga_Upah_Item_"):
            index = key.split('_')[-1]
            if index not in items_from_form: items_from_form[index] = {}
            items_from_form[index]['hargaUpah'] = value
    
    for index, item_data in items_from_form.items():
        jenis_pekerjaan_val = item_data.get("jenisPekerjaan", "").strip()
        volume_val = float(item_data.get('volume', 0))

        if not jenis_pekerjaan_val or volume_val <= 0:
            continue

        kategori = item_data.get("kategori", "Lain-lain")
        is_sbo_item = kategori == "PEKERJAAN SBO"

        if exclude_sbo and is_sbo_item:
            continue

        if kategori not in grouped_items: 
            grouped_items[kategori] = []

        raw_material_price = item_data.get('hargaMaterial', 0)
        raw_upah_price = item_data.get('hargaUpah', 0)
        harga_material = float(raw_material_price) if isinstance(raw_material_price, (int, float)) else 0
        harga_upah = float(raw_upah_price) if isinstance(raw_upah_price, (int, float)) else 0
        
        harga_material_formatted = format_rupiah(harga_material) if isinstance(raw_material_price, (int, float)) else raw_material_price
        harga_upah_formatted = format_rupiah(harga_upah) if isinstance(raw_upah_price, (int, float)) else raw_upah_price
        
        volume = item_data.get('volume', 0)
        total_material_raw = volume * harga_material
        total_upah_raw = volume * harga_upah
        total_harga_raw = total_material_raw + total_upah_raw
        grand_total += total_harga_raw
        
        item_to_add = {
            "jenisPekerjaan": jenis_pekerjaan_val,
            "satuan": item_data.get("satuan"),
            "volume": volume,
            "is_sbo": is_sbo_item, # Flag untuk PDF
            "hargaMaterialFormatted": harga_material_formatted,
            "hargaUpahFormatted": harga_upah_formatted,
            "totalMaterialFormatted": format_rupiah(total_material_raw),
            "totalUpahFormatted": format_rupiah(total_upah_raw),
            "totalHargaFormatted": format_rupiah(total_harga_raw),
            "totalMaterialRaw": total_material_raw,
            "totalUpahRaw": total_upah_raw,
            "totalHargaRaw": total_harga_raw
        }
        grouped_items[kategori].append(item_to_add)
    
    ppn = grand_total * 0.11
    final_grand_total = grand_total + ppn
    
    creator_details = ""
    creator_email = form_data.get(config.COLUMN_NAMES.EMAIL_PEMBUAT)
    creator_timestamp = form_data.get(config.COLUMN_NAMES.TIMESTAMP)
    if creator_email and creator_timestamp:
        creator_details = create_approval_details_block(
            google_provider,
            creator_email,
            creator_timestamp
        )

    coordinator_approval_details = ""
    if form_data.get(config.COLUMN_NAMES.KOORDINATOR_APPROVER):
        coordinator_approval_details = create_approval_details_block(
            google_provider, form_data.get(config.COLUMN_NAMES.KOORDINATOR_APPROVER),
            form_data.get(config.COLUMN_NAMES.KOORDINATOR_APPROVAL_TIME)
        )

    manager_approval_details = ""
    if form_data.get(config.COLUMN_NAMES.MANAGER_APPROVER):
        manager_approval_details = create_approval_details_block(
            google_provider, form_data.get(config.COLUMN_NAMES.MANAGER_APPROVER),
            form_data.get(config.COLUMN_NAMES.MANAGER_APPROVAL_TIME)
        )
    
    tanggal_pengajuan_str = ''
    timestamp_from_data = form_data.get(config.COLUMN_NAMES.TIMESTAMP)
    dt_object = parse_flexible_timestamp(timestamp_from_data)
    if dt_object:
        tanggal_pengajuan_str = dt_object.strftime('%d %B %Y')
    else:
        tanggal_pengajuan_str = str(timestamp_from_data).split(" ")[0] if timestamp_from_data else ''
    
    template_data = form_data.copy()
    nomor_ulok_raw = template_data.get(config.COLUMN_NAMES.LOKASI, '')
    if isinstance(nomor_ulok_raw, str) and len(nomor_ulok_raw) == 12:
        template_data[config.COLUMN_NAMES.LOKASI] = f"{nomor_ulok_raw[:4]}-{nomor_ulok_raw[4:8]}-{nomor_ulok_raw[8:]}"

    logo_path = 'file:///' + os.path.abspath(os.path.join('static', 'Alfamart-Emblem.png'))

    html_string = render_template(
        'pdf_report.html', 
        data=template_data,
        grouped_items=grouped_items,
        grand_total=format_rupiah(grand_total), 
        ppn=format_rupiah(ppn),
        final_grand_total=format_rupiah(final_grand_total), 
        logo_path=logo_path,
        JABATAN=config.JABATAN,
        creator_details=creator_details,
        coordinator_approval_details=coordinator_approval_details,
        manager_approval_details=manager_approval_details,
        format_rupiah=format_rupiah,
        tanggal_pengajuan=tanggal_pengajuan_str
    )
    
    return HTML(string=html_string).write_pdf()