document.addEventListener('DOMContentLoaded', () => {
  // --- Global Variable Declarations ---
  const form = document.getElementById("spk-form");
  const submitButton = document.getElementById("submit-button");
  const messageDiv = document.getElementById("message");
  const ulokSelect = document.getElementById("nomor_ulok");
  const ulokSearch = document.getElementById("ulok_search");
  let allUlokOptions = []; // [{value, text} untuk dropdown]
  // Render opsi ke <select> sesuai teks pencarian
  function renderUlokOptions(filterText = "") {
    const ft = filterText.trim().toLowerCase();
    ulokSelect.innerHTML = '<option value="">-- Pilih Nomor Ulok --</option>';

    allUlokOptions
      .filter(
        (o) =>
          !ft ||
          o.value.toLowerCase().includes(ft) ||
          o.text.toLowerCase().includes(ft)
      )
      .forEach((o) => {
        const opt = document.createElement("option");
        opt.value = o.value;
        opt.textContent = o.text;
        ulokSelect.appendChild(opt);
      });
  }

  const cabangSelect = document.getElementById("cabang");
  const rabDetailsDiv = document.getElementById("rab-details");
  const kontraktorSelect = document.getElementById("nama_kontraktor");
  const spkCabangSpan = document.getElementById("spk_kode_cabang");
  const parCabangSpan = document.getElementById("par_kode_cabang");

  // Variabel baru untuk elemen Nama Toko
  const detailNamaTokoSpan = document.getElementById("detail_nama_toko");
  const namaTokoInput = document.getElementById("nama_toko");

  const branchToUlokMap = {
    "WHC IMAM BONJOL": "7AZ1",
    LUWU: "2VZ1",
    KARAWANG: "1JZ1",
    REMBANG: "2AZ1",
    BANJARMASIN: "1GZ1",
    PARUNG: "1MZ1",
    TEGAL: "2PZ1",
    GORONTALO: "2SZ1",
    PONTIANAK: "1PZ1",
    LOMBOK: "1SZ1",
    KOTABUMI: "1VZ1",
    SERANG: "2GZ1",
    CIANJUR: "2JZ1",
    BALARAJA: "TZ01",
    SIDOARJO: "UZ01",
    MEDAN: "WZ01",
    BOGOR: "XZ01",
    JEMBER: "YZ01",
    BALI: "QZ01",
    PALEMBANG: "PZ01",
    KLATEN: "OZ01",
    MAKASSAR: "RZ01",
    PLUMBON: "VZ01",
    PEKANBARU: "1AZ1",
    JAMBI: "1DZ1",
    "HEAD OFFICE": "Z001",
    "BANDUNG 1": "BZ01",
    "BANDUNG 2": "NZ01",
    BEKASI: "CZ01",
    CILACAP: "IZ01",
    CILEUNGSI: "JZ01",
    SEMARANG: "HZ01",
    CIKOKOL: "KZ01",
    LAMPUNG: "LZ01",
    MALANG: "MZ01",
    MANADO: "1YZ1",
    BATAM: "2DZ1",
    MADIUN: "2MZ1",
  };

  const PYTHON_API_BASE_URL = "https://building-alfamart.onrender.com";
  let approvedRabData = [];

  const branchGroups = {
    "BANDUNG 1": ["BANDUNG 1", "BANDUNG 2"],
    "BANDUNG 2": ["BANDUNG 1", "BANDUNG 2"],
    LOMBOK: ["LOMBOK", "SUMBAWA"],
    SUMBAWA: ["LOMBOK", "SUMBAWA"],
    MEDAN: ["MEDAN", "ACEH"],
    ACEH: ["MEDAN", "ACEH"],
    PALEMBANG: ["PALEMBANG", "BENGKULU", "BANGKA", "BELITUNG"],
    BENGKULU: ["PALEMBANG", "BENGKULU", "BANGKA", "BELITUNG"],
    BANGKA: ["PALEMBANG", "BENGKULU", "BANGKA", "BELITUNG"],
    BELITUNG: ["PALEMBANG", "BENGKULU", "BANGKA", "BELITUNG"],
    SIDOARJO: ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"],
    "SIDOARJO BPN_SMD": [
      "SIDOARJO",
      "SIDOARJO BPN_SMD",
      "MANOKWARI",
      "NTT",
      "SORONG",
    ],
    MANOKWARI: ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"],
    NTT: ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"],
    SORONG: ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"],
  };

  // --- Helper Functions ---
  const formatRupiah = (number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);

  const showMessage = (text, type = "info") => {
    messageDiv.textContent = text;
    messageDiv.style.display = "block";
    if (type === "success") messageDiv.style.backgroundColor = "#28a745";
    else if (type === "error") messageDiv.style.backgroundColor = "#dc3545";
    else messageDiv.style.backgroundColor = "#007bff";
  };

  function setCabangCode(cabangName) {
    if (!cabangName) {
      if (spkCabangSpan) spkCabangSpan.textContent = "(Cabang)";
      if (parCabangSpan) parCabangSpan.textContent = "(Cabang)";
      return;
    }
    const cabangCode = branchToUlokMap[cabangName.toUpperCase()] || cabangName;
    if (spkCabangSpan) spkCabangSpan.textContent = cabangCode;
    if (parCabangSpan) parCabangSpan.textContent = cabangCode;
  }

  async function fetchApprovedRab() {
    const userCabang = sessionStorage.getItem("loggedInUserCabang");
    if (!userCabang) {
      showMessage(
        "Cabang pengguna tidak ditemukan. Silakan login ulang.",
        "error"
      );
      return;
    }

    try {
      const response = await fetch(
        `${PYTHON_API_BASE_URL}/api/get_approved_rab?cabang=${encodeURIComponent(
          userCabang
        )}`
      );
      if (!response.ok) throw new Error("Gagal mengambil data dari server.");

      const data = await response.json();
      approvedRabData = data;

      if (data.length > 0) {
        // simpan semua opsi ke array dasar untuk difilter
        allUlokOptions = data.map((rab) => {
          const lingkup = rab["Lingkup_Pekerjaan"] || "N/A";
          return {
            value: `${rab["Nomor Ulok"]} (${lingkup})`,
            text: `${rab["Nomor Ulok"]} (${lingkup}) - ${rab["Proyek"]}`,
          };
        });
        renderUlokOptions(); // render awal (tanpa filter)
      } else {
        allUlokOptions = [];
        ulokSelect.innerHTML =
          '<option value="">-- Tidak ada RAB yang disetujui --</option>';
      }
    } catch (error) {
      showMessage(`Error: ${error.message}`, "error");
      ulokSelect.innerHTML =
        '<option value="">-- Gagal memuat data --</option>';
    }
  }

  function populateCabangSelect() {
    const userCabang = sessionStorage
      .getItem("loggedInUserCabang")
      ?.toUpperCase();
    if (!userCabang) return;

    cabangSelect.innerHTML = "";
    const group = branchGroups[userCabang];
    if (group) {
      group.forEach((branchName) => {
        const option = document.createElement("option");
        option.value = branchName;
        option.textContent = branchName;
        cabangSelect.appendChild(option);
      });
      cabangSelect.value = userCabang;
      cabangSelect.disabled = false;
    } else {
      const option = document.createElement("option");
      option.value = userCabang;
      option.textContent = userCabang;
      cabangSelect.appendChild(option);
      cabangSelect.value = userCabang;
      cabangSelect.disabled = true;
    }
  }

  async function fetchKontraktor(cabang) {
    if (!cabang) {
      kontraktorSelect.innerHTML =
        '<option value="">-- Pilih RAB terlebih dahulu --</option>';
      return;
    }

    kontraktorSelect.innerHTML =
      '<option value="">-- Memuat kontraktor... --</option>';
    kontraktorSelect.disabled = true;

    try {
      const response = await fetch(
        `${PYTHON_API_BASE_URL}/api/get_kontraktor?cabang=${encodeURIComponent(
          cabang
        )}`
      );
      if (!response.ok)
        throw new Error("Gagal mengambil data kontraktor dari server.");

      const kontraktorList = await response.json();

      kontraktorSelect.innerHTML =
        '<option value="">-- Pilih Kontraktor --</option>';
      if (kontraktorList.length > 0) {
        kontraktorList.forEach((nama) => {
          const option = document.createElement("option");
          option.value = nama;
          option.textContent = nama;
          kontraktorSelect.appendChild(option);
        });
      } else {
        kontraktorSelect.innerHTML =
          '<option value="">-- Tidak ada kontraktor aktif untuk cabang ini --</option>';
      }
    } catch (error) {
      showMessage(`Error memuat kontraktor: ${error.message}`, "error");
      kontraktorSelect.innerHTML =
        '<option value="">-- Gagal memuat data --</option>';
    } finally {
      kontraktorSelect.disabled = false;
    }
  }

  async function checkSpkStatus(nomorUlok, lingkupPekerjaan) {
    if (!nomorUlok || !lingkupPekerjaan) return null;
    try {
      const url = `${PYTHON_API_BASE_URL}/api/get_spk_status?ulok=${encodeURIComponent(
        nomorUlok
      )}&lingkup=${encodeURIComponent(lingkupPekerjaan)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error("Gagal cek status SPK:", err);
      return null;
    }
  }

  // Fungsi Baru: Auto-fill form jika status Ditolak
  function fillFormWithRejectedData(data) {
    showMessage("Mengambil data revisi (SPK Ditolak)...", "info");

    // 1. Isi Tanggal Mulai & Durasi
    if (data["Waktu Mulai"]) {
      // Ambil YYYY-MM-DD saja (antisipasi format ISO lengkap)
      document.getElementById("waktu_mulai").value = data["Waktu Mulai"].split("T")[0];
    }
    if (data["Durasi"]) {
      document.getElementById("durasi").value = data["Durasi"];
    }

    // 2. Parsing Nomor SPK
    // Format: 001/PROPNDEV-KZ01/III/25  atau (Otomatis)/PROPNDEV-KZ01/III/25
    // Split berdasarkan '/'
    const spkFull = data["Nomor SPK"] || "";
    const spkParts = spkFull.split("/");
    
    // Asumsi format standar 4 bagian: [Nomor] [PROPNDEV-Cabang] [Bulan] [Tahun]
    if (spkParts.length >= 4) {
      // Index 2 = Bulan (Romawi), Index 3 = Tahun
      document.getElementById("spk_manual_1").value = spkParts[2]; 
      document.getElementById("spk_manual_2").value = spkParts[3]; 
    }

    // 3. Parsing PAR
    // Format: 0001/PROPNDEV-KZ01-III-25
    // Split pertama by '/' -> [0001] [PROPNDEV-KZ01-III-25]
    const parFull = data["PAR"] || "";
    const parPartsSlash = parFull.split("/");

    if (parPartsSlash.length >= 2) {
      // Bagian depan adalah Nomor Urut PAR
      document.getElementById("par_manual_1").value = parPartsSlash[0];

      // Bagian belakang dipisah by '-' -> [PROPNDEV] [KZ01] [III] [25]
      const suffixParts = parPartsSlash[1].split("-");
      if (suffixParts.length >= 4) {
         // suffixParts[suffixParts.length - 2] = Bulan
         // suffixParts[suffixParts.length - 1] = Tahun
         const len = suffixParts.length;
         document.getElementById("par_manual_2").value = suffixParts[len - 2];
         document.getElementById("par_manual_3").value = suffixParts[len - 1];
      }
    }
  }

  // --- REVISI EVENT LISTENER ulokSelect ---
  ulokSelect.addEventListener("change", async () => {
    const selectedValue = ulokSelect.value;
    // Reset form fields manual dulu agar bersih
    document.getElementById("spk_manual_1").value = "";
    document.getElementById("spk_manual_2").value = "";
    document.getElementById("par_manual_1").value = "";
    document.getElementById("par_manual_2").value = "";
    document.getElementById("par_manual_3").value = "";
    document.getElementById("waktu_mulai").value = "";
    document.getElementById("durasi").value = "";
    showMessage("", "none"); // Hapus pesan lama

    const selectedUlok = selectedValue.split(" (")[0];
    const selectedLingkup = selectedValue.includes("(")
      ? selectedValue.split("(")[1].replace(")", "")
      : null;

    const selectedRab = approvedRabData.find(
      (rab) =>
        rab["Nomor Ulok"] === selectedUlok &&
        rab["Lingkup_Pekerjaan"] === selectedLingkup
    );

    if (selectedRab) {
      const namaToko = selectedRab["Nama_Toko"] || selectedRab["nama_toko"] || "N/A";

      document.getElementById("detail_proyek").textContent = selectedRab.Proyek || "N/A";
      detailNamaTokoSpan.textContent = namaToko;
      namaTokoInput.value = namaToko;
      
      document.getElementById("detail_lingkup").textContent = selectedRab.Lingkup_Pekerjaan || "N/A";
      document.getElementById("detail_total").textContent = formatRupiah(
        selectedRab["Grand Total Final"] || 0
      );

      rabDetailsDiv.style.display = "block";
      fetchKontraktor(selectedRab.Cabang);
      setCabangCode(selectedRab.Cabang);

      // --- LOGIKA BARU: Cek Status SPK Ditolak & Autofill ---
      if (selectedUlok && selectedLingkup) {
        showMessage("Mengecek status SPK...", "info");
        const spkStatus = await checkSpkStatus(selectedUlok, selectedLingkup);
        
        if (spkStatus) {
            if (spkStatus.Status === "SPK Ditolak") {
                showMessage("SPK sebelumnya DITOLAK. Data lama telah dimuat untuk revisi.", "error"); // Pakai warna merah/error agar notice
                fillFormWithRejectedData(spkStatus.Data);
            } else if (spkStatus.Status === "Menunggu Persetujuan Branch Manager") {
                showMessage("SPK sedang dalam proses persetujuan.", "info");
            } else if (spkStatus.Status === "SPK Disetujui") {
                showMessage("SPK sudah disetujui.", "success");
            }
        } else {
             showMessage("Silakan lengkapi form untuk pengajuan SPK baru.", "info");
        }
      }

    } else {
      rabDetailsDiv.style.display = "none";
      kontraktorSelect.innerHTML = '<option value="">-- Pilih RAB terlebih dahulu --</option>';
      const userCabang = sessionStorage.getItem("loggedInUserCabang");
      setCabangCode(userCabang);
    }
  });

  async function handleFormSubmit(e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    showMessage("Mengirim data SPK...", "info");
    submitButton.disabled = true;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data["Dibuat Oleh"] = sessionStorage.getItem("loggedInUserEmail");

    // ===== Ambil Nomor Ulok & Lingkup =====
    const ulokFromForm = data["Nomor Ulok"].split(" (")[0];
    const lingkupFromForm = data["Nomor Ulok"].includes("(")
      ? data["Nomor Ulok"].split("(")[1].replace(")", "")
      : null;

    // ===== Ambil Approved RAB untuk isi field SPK =====
    const selectedRab = approvedRabData.find(
      (rab) =>
        rab["Nomor Ulok"] === ulokFromForm &&
        rab["Lingkup_Pekerjaan"] === lingkupFromForm
    );

    if (!selectedRab) {
      showMessage("Data RAB tidak valid. Silakan pilih ulang.", "error");
      submitButton.disabled = false;
      return;
    }

    // ====== CEK STATUS SPK EXISTING ======
    let spkStatus = null;

    try {
      // 🔥 Kirim ULok + Lingkup ke backend
      const res = await fetch(
        `${PYTHON_API_BASE_URL}/api/get_spk_status?ulok=${encodeURIComponent(
          ulokFromForm
        )}&lingkup=${encodeURIComponent(lingkupFromForm)}`
      );

      spkStatus = await res.json();
    } catch (err) {
      console.error("Gagal cek status SPK:", err);
    }

    // ====== Aturan Pengecekan ======
    if (spkStatus && spkStatus.Status) {
      const status = spkStatus.Status;

      if (status === "Menunggu Persetujuan Branch Manager") {
        showMessage(
          "SPK untuk kombinasi Nomor Ulok & Lingkup ini sedang menunggu persetujuan Branch Manager. Tidak bisa mengirim ulang.",
          "error"
        );
        submitButton.disabled = false;
        return;
      }

      if (status === "SPK Disetujui") {
        showMessage(
          "SPK untuk kombinasi Nomor Ulok & Lingkup ini sudah disetujui. Tidak bisa membuat SPK baru.",
          "error"
        );
        submitButton.disabled = false;
        return;
      }

      if (status === "SPK Ditolak") {
        // MODE REVISI
        data["Revisi"] = "YES";
        data["RowIndex"] = spkStatus.RowIndex;
      }
    }

    // ====== Isi Data SPK (tetap sama) ======
    data["Nomor Ulok"] = ulokFromForm;
    data["Proyek"] = selectedRab.Proyek;
    data["Alamat"] = selectedRab.Alamat;
    data["Lingkup Pekerjaan"] = selectedRab.Lingkup_Pekerjaan;
    data["Grand Total"] = selectedRab["Grand Total Final"];
    data["Cabang"] = selectedRab.Cabang;
    data["Nama_Toko"] =
      selectedRab["Nama_Toko"] || selectedRab["nama_toko"] || "N/A";

    const cabangCode =
      branchToUlokMap[selectedRab.Cabang.toUpperCase()] || selectedRab.Cabang;

    data["Nomor SPK"] = `(Otomatis)/PROPNDEV-${cabangCode}/${data.spk_manual_1}/${data.spk_manual_2}`;
    data["PAR"] = `${data.par_manual_1}/PROPNDEV-${cabangCode}-${data.par_manual_2}-${data.par_manual_3}`;

    // ====== Submit ke Backend ======
    try {
      const response = await fetch(`${PYTHON_API_BASE_URL}/api/submit_spk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.status === "success") {
        showMessage("SPK berhasil dikirim!", "success");
        form.reset();
        rabDetailsDiv.style.display = "none";
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error(result.message || "Terjadi kesalahan di server.");
      }
    } catch (error) {
      showMessage(`Error: ${error.message}`, "error");
      submitButton.disabled = false;
    }
  }

  // --- Event Listeners ---
  // Tambahkan ini paling atas di bagian Event Listeners
  if (ulokSearch) {
    ulokSearch.addEventListener("input", (e) => {
      renderUlokOptions(e.target.value);
    });
  }

  // Listener bawaan kamu tetap di bawahnya
  ulokSelect.addEventListener("change", () => {
    const selectedValue = ulokSelect.value;
    const selectedUlok = selectedValue.split(" (")[0];
    const selectedLingkup = selectedValue.includes("(")
      ? selectedValue.split("(")[1].replace(")", "")
      : null;

    const selectedRab = approvedRabData.find(
      (rab) =>
        rab["Nomor Ulok"] === selectedUlok &&
        rab["Lingkup_Pekerjaan"] === selectedLingkup
    );

    if (selectedRab) {
      const namaToko =
        selectedRab["Nama_Toko"] || selectedRab["nama_toko"] || "N/A";

      document.getElementById("detail_proyek").textContent =
        selectedRab.Proyek || "N/A";

      // TAMBAHAN: Isi data Nama Toko
      detailNamaTokoSpan.textContent = namaToko;
      namaTokoInput.value = namaToko; // Simpan di input hidden

      document.getElementById("detail_lingkup").textContent =
        selectedRab.Lingkup_Pekerjaan || "N/A";
      document.getElementById("detail_total").textContent = formatRupiah(
        selectedRab["Grand Total Final"] || 0
      );

      rabDetailsDiv.style.display = "block";
      fetchKontraktor(selectedRab.Cabang);
      setCabangCode(selectedRab.Cabang);
    } else {
      rabDetailsDiv.style.display = "none";
      kontraktorSelect.innerHTML =
        '<option value="">-- Pilih RAB terlebih dahulu --</option>';
      const userCabang = sessionStorage.getItem("loggedInUserCabang");
      setCabangCode(userCabang);
    }
  });

  form.addEventListener("submit", handleFormSubmit);

  function checkSessionTime() {
    try {
      const startHour = 6;
      const endHour = 18;

      const now = new Date();
      const options = {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        hour12: false,
      };
      const currentHour = parseInt(
        new Intl.DateTimeFormat("en-US", options).format(now)
      );

      if (currentHour < startHour || currentHour >= endHour) {
        const token = sessionStorage.getItem("loggedInUserEmail");

        if (token) {
          sessionStorage.removeItem("authenticated");
          sessionStorage.removeItem("loggedInUserEmail");
          sessionStorage.removeItem("loggedInUserCabang");
          sessionStorage.removeItem("userRole");

          alert(
            "Sesi Anda telah berakhir karena di luar jam operasional (06:00 - 18:00 WIB)."
          );

          window.location.href = "/login.html";
        }
      }
    } catch (err) {
      console.error("Gagal menjalankan pengecekan jam sesi:", err);
    }
  }

  // --- Initialization ---
  function initializePage() {
    const userCabang = sessionStorage.getItem("loggedInUserCabang");
    populateCabangSelect();
    setCabangCode(userCabang);
    fetchApprovedRab();

    checkSessionTime();
    setInterval(checkSessionTime, 300000);
  }

  initializePage();
});