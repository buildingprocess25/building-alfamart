document.addEventListener('DOMContentLoaded', () => {
    // --- Global Variable Declarations ---
    const form = document.getElementById('spk-form');
    const submitButton = document.getElementById('submit-button');
    const messageDiv = document.getElementById('message');
    const ulokSelect = document.getElementById('nomor_ulok');
    const cabangSelect = document.getElementById('cabang');
    const rabDetailsDiv = document.getElementById('rab-details');
    const kontraktorSelect = document.getElementById('nama_kontraktor');
    const spkCabangSpan = document.getElementById('spk_kode_cabang');
    const parCabangSpan = document.getElementById('par_kode_cabang');

    // Variabel baru untuk elemen Nama Toko
    const detailNamaTokoSpan = document.getElementById('detail_nama_toko');
    const namaTokoInput = document.getElementById('nama_toko');
    
    const branchToUlokMap = {
        "WHC IMAM BONJOL": "7AZ1", "LUWU": "2VZ1", "KARAWANG": "1JZ1", "REMBANG": "2AZ1",
        "BANJARMASIN": "1GZ1", "PARUNG": "1MZ1", "TEGAL": "2PZ1", "GORONTALO": "2SZ1",
        "PONTIANAK": "1PZ1", "LOMBOK": "1SZ1", "KOTABUMI": "1VZ1", "SERANG": "2GZ1",
        "CIANJUR": "2JZ1", "BALARAJA": "TZ01", "SIDOARJO": "UZ01", "MEDAN": "WZ01",
        "BOGOR": "XZ01", "JEMBER": "YZ01", "BALI": "QZ01", "PALEMBANG": "PZ01",
        "KLATEN": "OZ01", "MAKASSAR": "RZ01", "PLUMBON": "VZ01", "PEKANBARU": "1AZ1",
        "JAMBI": "1DZ1", "HEAD OFFICE": "Z001", "BANDUNG 1": "BZ01", "BANDUNG 2": "NZ01",
        "BEKASI": "CZ01", "CILACAP": "IZ01", "CILEUNGSI2": "JZ01", "SEMARANG": "HZ01",
        "CIKOKOL": "KZ01", "LAMPUNG": "LZ01", "MALANG": "MZ01", "MANADO": "1YZ1",
        "BATAM": "2DZ1", "MADIUN": "2MZ1"
    };
    
    const PYTHON_API_BASE_URL = "https://building-alfamart.onrender.com";
    let approvedRabData = [];

    const branchGroups = {
        "BANDUNG 1": ["BANDUNG 1", "BANDUNG 2"], "BANDUNG 2": ["BANDUNG 1", "BANDUNG 2"],
        "LOMBOK": ["LOMBOK", "SUMBAWA"], "SUMBAWA": ["LOMBOK", "SUMBAWA"],
        "MEDAN": ["MEDAN", "ACEH"], "ACEH": ["MEDAN", "ACEH"],
        "PALEMBANG": ["PALEMBANG", "BENGKULU", "BANGKA", "BELITUNG"], "BENGKULU": ["PALEMBANG", "BENGKULU", "BANGKA", "BELITUNG"],
        "BANGKA": ["PALEMBANG", "BENGKULU", "BANGKA", "BELITUNG"], "BELITUNG": ["PALEMBANG", "BENGKULU", "BANGKA", "BELITUNG"],
        "SIDOARJO": ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"], "SIDOARJO BPN_SMD": ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"],
        "MANOKWARI": ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"], "NTT": ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"],
        "SORONG": ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"]
    };

    // --- Helper Functions ---
    const formatRupiah = (number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(number);

    const showMessage = (text, type = 'info') => {
        messageDiv.textContent = text;
        messageDiv.style.display = 'block';
        if (type === 'success') messageDiv.style.backgroundColor = '#28a745';
        else if (type === 'error') messageDiv.style.backgroundColor = '#dc3545';
        else messageDiv.style.backgroundColor = '#007bff';
    };

    function setCabangCode(cabangName) {
        if (!cabangName) {
            if (spkCabangSpan) spkCabangSpan.textContent = '(Cabang)';
            if (parCabangSpan) parCabangSpan.textContent = '(Cabang)';
            return;
        }
        const cabangCode = branchToUlokMap[cabangName.toUpperCase()] || cabangName;
        if (spkCabangSpan) spkCabangSpan.textContent = cabangCode;
        if (parCabangSpan) parCabangSpan.textContent = cabangCode;
    }

    // --- Main Functions ---
    async function fetchApprovedRab() {
        const userCabang = sessionStorage.getItem('loggedInUserCabang');
        if (!userCabang) {
            showMessage('Cabang pengguna tidak ditemukan. Silakan login ulang.', 'error');
            return;
        }

        try {
            const response = await fetch(`${PYTHON_API_BASE_URL}/api/get_approved_rab?cabang=${encodeURIComponent(userCabang)}`);
            if (!response.ok) throw new Error('Gagal mengambil data dari server.');
            
            const data = await response.json();
            approvedRabData = data;

            ulokSelect.innerHTML = '<option value="">-- Pilih Nomor Ulok --</option>';
            if (data.length > 0) {
                data.forEach(rab => {
                    const option = document.createElement('option');
                    const lingkup = rab['Lingkup_Pekerjaan'] || 'N/A';
                    // Tampilkan Nama Toko di dropdown agar lebih mudah dicari
                    const namaToko = rab['Nama_Toko'] || rab['nama_toko'] || '';
                    option.value = rab['Nomor Ulok'] + ' (' + lingkup + ')';
                    option.textContent = `${rab['Nomor Ulok']} (${lingkup}) - ${rab['Proyek']}`;
                    ulokSelect.appendChild(option);
                });
            } else {
                ulokSelect.innerHTML = '<option value="">-- Tidak ada RAB yang disetujui --</option>';
            }
        } catch (error) {
            showMessage(`Error: ${error.message}`, 'error');
            ulokSelect.innerHTML = '<option value="">-- Gagal memuat data --</option>';
        }
    }

    function populateCabangSelect() {
        const userCabang = sessionStorage.getItem('loggedInUserCabang')?.toUpperCase();
        if (!userCabang) return;

        cabangSelect.innerHTML = '';
        const group = branchGroups[userCabang];
        if (group) {
            group.forEach(branchName => {
                const option = document.createElement('option');
                option.value = branchName;
                option.textContent = branchName;
                cabangSelect.appendChild(option);
            });
            cabangSelect.value = userCabang;
            cabangSelect.disabled = false;
        } else {
            const option = document.createElement('option');
            option.value = userCabang;
            option.textContent = userCabang;
            cabangSelect.appendChild(option);
            cabangSelect.value = userCabang;
            cabangSelect.disabled = true;
        }
    }

    async function fetchKontraktor(cabang) {
        if (!cabang) {
            kontraktorSelect.innerHTML = '<option value="">-- Pilih RAB terlebih dahulu --</option>';
            return;
        }
        
        kontraktorSelect.innerHTML = '<option value="">-- Memuat kontraktor... --</option>';
        kontraktorSelect.disabled = true;
        
        try {
            const response = await fetch(`${PYTHON_API_BASE_URL}/api/get_kontraktor?cabang=${encodeURIComponent(cabang)}`);
            if (!response.ok) throw new Error('Gagal mengambil data kontraktor dari server.');

            const kontraktorList = await response.json();
            
            kontraktorSelect.innerHTML = '<option value="">-- Pilih Kontraktor --</option>';
            if (kontraktorList.length > 0) {
                kontraktorList.forEach(nama => {
                    const option = document.createElement('option');
                    option.value = nama;
                    option.textContent = nama;
                    kontraktorSelect.appendChild(option);
                });
            } else {
                kontraktorSelect.innerHTML = '<option value="">-- Tidak ada kontraktor aktif untuk cabang ini --</option>';
            }
        } catch (error) {
            showMessage(`Error memuat kontraktor: ${error.message}`, 'error');
            kontraktorSelect.innerHTML = '<option value="">-- Gagal memuat data --</option>';
        } finally {
            kontraktorSelect.disabled = false;
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        showMessage('Mengirim data SPK...', 'info');
        submitButton.disabled = true;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data['Dibuat Oleh'] = sessionStorage.getItem('loggedInUserEmail');

        const ulokFromForm = data['Nomor Ulok'].split(' (')[0];
        const lingkupFromForm = data['Nomor Ulok'].includes('(') ? data['Nomor Ulok'].split('(')[1].replace(')', '') : null;
        
        const selectedRab = approvedRabData.find(rab => rab['Nomor Ulok'] === ulokFromForm && rab['Lingkup_Pekerjaan'] === lingkupFromForm);
        
        if (selectedRab) {
            data['Nomor Ulok'] = ulokFromForm;
            data['Proyek'] = selectedRab.Proyek;
            data['Alamat'] = selectedRab.Alamat;
            data['Lingkup Pekerjaan'] = selectedRab.Lingkup_Pekerjaan;
            data['Grand Total'] = selectedRab['Grand Total Non-SBO'];
            data['Cabang'] = selectedRab.Cabang;

            // TAMBAHAN: Pastikan Nama Toko (dari input hidden) terkirim
            // data['Nama_Toko'] sudah otomatis ada dari new FormData(form)
            // Tapi kita tambahkan lagi dari selectedRab untuk JAMINAN datanya benar
            data['Nama_Toko'] = selectedRab['Nama_Toko'] || selectedRab['nama_toko'] || 'N/A';

            const cabangCode = branchToUlokMap[selectedRab.Cabang.toUpperCase()] || selectedRab.Cabang;
            
            data['Nomor SPK'] = `(Otomatis)/PROPNDEV-${cabangCode}/${data.spk_manual_1}/${data.spk_manual_2}`;
            data['PAR'] = `${data.par_manual_1}/PROPNDEV-${cabangCode}-${data.par_manual_2}-${data.par_manual_3}`;

        } else {
             showMessage('Data RAB yang dipilih tidak valid. Silakan pilih ulang.', 'error');
             submitButton.disabled = false;
             return;
        }

        try {
            const response = await fetch(`${PYTHON_API_BASE_URL}/api/submit_spk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();

            if (response.ok && result.status === 'success') {
                showMessage('SPK berhasil dikirim! Halaman akan dimuat ulang.', 'success');
                form.reset();
                rabDetailsDiv.style.display = 'none';
                setTimeout(() => window.location.reload(), 2000);
            } else {
                throw new Error(result.message || 'Terjadi kesalahan di server.');
            }
        } catch (error) {
            showMessage(`Error: ${error.message}`, 'error');
            submitButton.disabled = false;
        }
    }
    
    // --- Event Listeners ---
    ulokSelect.addEventListener('change', () => {
        const selectedValue = ulokSelect.value;
        const selectedUlok = selectedValue.split(' (')[0];
        const selectedLingkup = selectedValue.includes('(') ? selectedValue.split('(')[1].replace(')', '') : null;
        
        const selectedRab = approvedRabData.find(rab => rab['Nomor Ulok'] === selectedUlok && rab['Lingkup_Pekerjaan'] === selectedLingkup);
        
        if (selectedRab) {
            const namaToko = selectedRab['Nama_Toko'] || selectedRab['nama_toko'] || 'N/A';

            document.getElementById('detail_proyek').textContent = selectedRab.Proyek || 'N/A';
            
            // TAMBAHAN: Isi data Nama Toko
            detailNamaTokoSpan.textContent = namaToko;
            namaTokoInput.value = namaToko; // Simpan di input hidden

            document.getElementById('detail_lingkup').textContent = selectedRab.Lingkup_Pekerjaan || 'N/A';
            document.getElementById('detail_total').textContent = formatRupiah(selectedRab['Grand Total Non-SBO'] || 0);
            
            rabDetailsDiv.style.display = 'block';
            fetchKontraktor(selectedRab.Cabang); 
            setCabangCode(selectedRab.Cabang);

        } else {
            rabDetailsDiv.style.display = 'none';
            kontraktorSelect.innerHTML = '<option value="">-- Pilih RAB terlebih dahulu --</option>';
            const userCabang = sessionStorage.getItem('loggedInUserCabang');
            setCabangCode(userCabang);
        }
    });

    form.addEventListener('submit', handleFormSubmit);

    // --- Initialization ---
    function initializePage() {
        const userCabang = sessionStorage.getItem('loggedInUserCabang');
        populateCabangSelect();
        setCabangCode(userCabang); // Panggil fungsi ini saat inisialisasi
        fetchApprovedRab();
    }

    initializePage();
});