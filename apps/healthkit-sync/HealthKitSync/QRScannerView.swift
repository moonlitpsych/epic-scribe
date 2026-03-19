import SwiftUI
import AVFoundation

struct QRScannerView: UIViewControllerRepresentable {
    @Binding var scannedCode: String?
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> ScannerViewController {
        let controller = ScannerViewController()
        controller.delegate = context.coordinator
        return controller
    }

    func updateUIViewController(_ uiViewController: ScannerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    class Coordinator: NSObject, ScannerViewControllerDelegate {
        let parent: QRScannerView

        init(parent: QRScannerView) {
            self.parent = parent
        }

        func didFind(code: String) {
            parent.scannedCode = code
            parent.dismiss()
        }

        func didCancel() {
            parent.dismiss()
        }
    }
}

protocol ScannerViewControllerDelegate: AnyObject {
    func didFind(code: String)
    func didCancel()
}

class ScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    weak var delegate: ScannerViewControllerDelegate?
    private let captureSession = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer!
    private var hasFound = false

    private let cutoutSize: CGFloat = 250

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device),
              captureSession.canAddInput(input) else {
            showError()
            return
        }

        captureSession.addInput(input)

        let output = AVCaptureMetadataOutput()
        guard captureSession.canAddOutput(output) else {
            showError()
            return
        }

        captureSession.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        output.metadataObjectTypes = [.qr]

        previewLayer = AVCaptureVideoPreviewLayer(session: captureSession)
        previewLayer.frame = view.layer.bounds
        previewLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer)

        addOverlay()
        addInstructionLabel()
        addCancelButton()

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.captureSession.startRunning()
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.layer.bounds
        // Re-layout overlay on rotation
        view.subviews.forEach { subview in
            if subview.tag == 100 {
                subview.frame = view.bounds
                subview.layer.sublayers?.forEach { $0.frame = view.bounds }
                if let mask = subview.layer.mask as? CAShapeLayer {
                    mask.frame = view.bounds
                    mask.path = createOverlayPath().cgPath
                }
            }
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if captureSession.isRunning {
            captureSession.stopRunning()
        }
    }

    // MARK: - Overlay

    private func addOverlay() {
        let overlayView = UIView(frame: view.bounds)
        overlayView.tag = 100
        overlayView.isUserInteractionEnabled = false

        // Semi-transparent background with transparent cutout
        let overlayLayer = CAShapeLayer()
        overlayLayer.frame = view.bounds
        overlayLayer.fillColor = UIColor.black.withAlphaComponent(0.6).cgColor
        overlayLayer.path = createOverlayPath().cgPath
        overlayLayer.fillRule = .evenOdd
        overlayView.layer.addSublayer(overlayLayer)

        // Corner brackets
        let centerX = view.bounds.midX
        let centerY = view.bounds.midY - 40
        let halfSize = cutoutSize / 2
        let bracketLength: CGFloat = 30
        let bracketWidth: CGFloat = 3

        let corners: [(CGFloat, CGFloat, Bool, Bool)] = [
            (centerX - halfSize, centerY - halfSize, true, true),    // top-left
            (centerX + halfSize, centerY - halfSize, false, true),   // top-right
            (centerX - halfSize, centerY + halfSize, true, false),   // bottom-left
            (centerX + halfSize, centerY + halfSize, false, false),  // bottom-right
        ]

        for (x, y, isLeft, isTop) in corners {
            let bracket = CAShapeLayer()
            let path = UIBezierPath()

            let hDir: CGFloat = isLeft ? 1 : -1
            let vDir: CGFloat = isTop ? 1 : -1

            path.move(to: CGPoint(x: x + hDir * bracketLength, y: y))
            path.addLine(to: CGPoint(x: x, y: y))
            path.addLine(to: CGPoint(x: x, y: y + vDir * bracketLength))

            bracket.path = path.cgPath
            bracket.strokeColor = UIColor.white.cgColor
            bracket.fillColor = UIColor.clear.cgColor
            bracket.lineWidth = bracketWidth
            bracket.lineCap = .round
            overlayView.layer.addSublayer(bracket)
        }

        view.addSubview(overlayView)
    }

    private func createOverlayPath() -> UIBezierPath {
        let centerX = view.bounds.midX
        let centerY = view.bounds.midY - 40
        let halfSize = cutoutSize / 2

        let fullPath = UIBezierPath(rect: view.bounds)
        let cutoutRect = CGRect(
            x: centerX - halfSize,
            y: centerY - halfSize,
            width: cutoutSize,
            height: cutoutSize
        )
        let cutoutPath = UIBezierPath(roundedRect: cutoutRect, cornerRadius: 4)
        fullPath.append(cutoutPath)
        return fullPath
    }

    // MARK: - Instruction Label

    private func addInstructionLabel() {
        let label = UILabel()
        label.text = "Point camera at QR code"
        label.textColor = .white
        label.font = .systemFont(ofSize: 16, weight: .medium)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)

        let centerY = view.bounds.midY - 40
        let bottomOfCutout = centerY + cutoutSize / 2

        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.topAnchor.constraint(equalTo: view.topAnchor, constant: bottomOfCutout + 24)
        ])
    }

    // MARK: - Cancel Button

    private func addCancelButton() {
        let button = UIButton(type: .system)
        button.setTitle("Cancel", for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 18, weight: .medium)
        button.setTitleColor(.white, for: .normal)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        view.addSubview(button)

        NSLayoutConstraint.activate([
            button.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            button.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20)
        ])
    }

    @objc private func cancelTapped() {
        captureSession.stopRunning()
        delegate?.didCancel()
    }

    // MARK: - Metadata Output

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard !hasFound,
              let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              object.type == .qr,
              let value = object.stringValue else { return }

        hasFound = true
        captureSession.stopRunning()
        AudioServicesPlaySystemSound(SystemSoundID(kSystemSoundID_Vibrate))
        delegate?.didFind(code: value)
    }

    private func showError() {
        let label = UILabel()
        label.text = "Camera not available"
        label.textColor = .white
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }
}
