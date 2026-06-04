import { useState, useEffect, useRef, useCallback } from 'react';
import { materialsService } from '../../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function QRPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState('generate');
  const [materials, setMaterials] = useState([]);
  const [selected, setSelected] = useState('');
  const [selectedMat, setSelectedMat] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const scannerDivRef = useRef(null);

  useEffect(() => {
    materialsService.getAll({ limit: 200 }).then(({ data }) => {
      setMaterials(data.data || []);
      // Auto-select if URL param
      const matId = searchParams.get('material');
      if (matId) {
        const mat = (data.data || []).find(m => m.id === matId);
        if (mat) { setSelected(mat.id); setSelectedMat(mat); }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selected) {
      const mat = materials.find(m => m.id === selected);
      setSelectedMat(mat || null);
    } else {
      setSelectedMat(null);
    }
  }, [selected, materials]);

  const startScanner = useCallback(() => {
    if (scannerRef.current) return;
    setScanning(true);
    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scanner.render(
      (decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          setScanResult(data);
          scanner.clear();
          scannerRef.current = null;
          setScanning(false);
          toast.success('QR Code scanned successfully!');
        } catch {
          setScanResult({ raw: decodedText });
          scanner.clear();
          scannerRef.current = null;
          setScanning(false);
        }
      },
      (err) => {}
    );
    scannerRef.current = scanner;
  }, []);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => { return () => { if (scannerRef.current) scannerRef.current.clear().catch(() => {}); }; }, []);

  const qrData = selectedMat ? JSON.stringify({
    id: selectedMat.id,
    material_id: selectedMat.material_id,
    name: selectedMat.name,
    sku: selectedMat.sku,
    status: selectedMat.status,
    location: selectedMat.warehouse_name,
  }) : '';

  const printQR = () => {
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html><head><title>QR Label - ${selectedMat?.material_id}</title>
      <style>body{margin:20px;font-family:Arial,sans-serif;text-align:center;}h2{font-size:16px;margin-bottom:8px;}p{font-size:12px;color:#666;margin:4px 0;}</style>
      </head><body>
      <h2>${selectedMat?.name}</h2>
      <p>${selectedMat?.material_id} ${selectedMat?.sku ? '| SKU: ' + selectedMat.sku : ''}</p>
      ${document.getElementById('mat-qr-svg')?.outerHTML || ''}
      <p>SMIMP — Scan for material details</p>
      </body></html>
    `);
    printWin.document.close();
    printWin.print();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📱 QR & Barcode Tracking</h1>
          <p className="page-subtitle">Generate QR codes and scan materials using your device camera</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn${tab === 'generate' ? ' active' : ''}`} onClick={() => { tab === 'scan' && stopScanner(); setTab('generate'); }} id="tab-generate">📲 Generate QR</button>
        <button className={`tab-btn${tab === 'scan' ? ' active' : ''}`} onClick={() => setTab('scan')} id="tab-scan">📷 Scan QR</button>
      </div>

      {tab === 'generate' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Select Material</span></div>
            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label">Material</label>
              <select className="form-select" value={selected} onChange={(e) => setSelected(e.target.value)} id="qr-material-select">
                <option value="">— Select a material —</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.material_id})</option>)}
              </select>
            </div>

            {selectedMat && (
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['Material ID', selectedMat.material_id], ['Name', selectedMat.name], ['SKU', selectedMat.sku], ['Status', selectedMat.status], ['Location', selectedMat.warehouse_name]].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div className="card-header" style={{ width: '100%' }}><span className="card-title">Generated QR Code</span></div>
            {selectedMat ? (
              <>
                <div style={{ background: 'white', padding: 20, borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
                  <QRCodeSVG id="mat-qr-svg" value={qrData} size={220} level="H" includeMargin={false} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedMat.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--primary-light)', marginTop: 4 }}>{selectedMat.material_id}</div>
                  {selectedMat.sku && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SKU: {selectedMat.sku}</div>}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <button className="btn btn-primary" onClick={printQR} id="print-qr-label">🖨️ Print Label</button>
                  <button className="btn btn-secondary" onClick={() => navigate(`/materials/${selectedMat.id}`)} id="view-material-from-qr">View Material →</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 64, marginBottom: 'var(--space-4)', opacity: 0.3 }}>📱</div>
                <div style={{ fontSize: 14 }}>Select a material to generate its QR code</div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'scan' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Camera Scanner</span></div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              Point your camera at a material QR code to scan it. Allow camera access when prompted.
            </p>

            {!scanning && !scanResult && (
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={startScanner} id="start-scan-btn">
                📷 Start Camera Scanner
              </button>
            )}

            {scanning && (
              <div>
                <div id="qr-reader" ref={scannerDivRef} style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }} />
                <button className="btn btn-secondary" style={{ marginTop: 12, width: '100%' }} onClick={stopScanner} id="stop-scan-btn">Stop Scanner</button>
              </div>
            )}

            {!scanning && !scanResult && (
              <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text)' }}>Tips:</strong>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  <li>Ensure good lighting</li>
                  <li>Hold the camera steady</li>
                  <li>QR code should fill the scan box</li>
                </ul>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Scan Result</span>
              {scanResult && <button className="btn btn-ghost btn-sm" onClick={() => { setScanResult(null); }}>Clear</button>}
            </div>
            {scanResult ? (
              <div>
                {scanResult.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', align: 'center', gap: 8, padding: 'var(--space-3)', background: 'var(--accent-glow)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✅ Valid SMIMP QR Code</span>
                    </div>
                    {[['Material ID', scanResult.material_id], ['Name', scanResult.name], ['SKU', scanResult.sku], ['Status', scanResult.status], ['Location', scanResult.location]].map(([label, value]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{value || '—'}</span>
                      </div>
                    ))}
                    <button className="btn btn-primary" style={{ marginTop: 'var(--space-2)' }} onClick={() => navigate(`/materials/${scanResult.id}`)} id="goto-material-from-scan">
                      View Material Details →
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ padding: 'var(--space-3)', background: 'var(--danger-glow)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>
                      ⚠️ External or unknown QR code
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all', color: 'var(--text-secondary)' }}>{scanResult.raw}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 64, marginBottom: 'var(--space-4)', opacity: 0.3 }}>📷</div>
                <div style={{ fontSize: 14 }}>Scan result will appear here</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
