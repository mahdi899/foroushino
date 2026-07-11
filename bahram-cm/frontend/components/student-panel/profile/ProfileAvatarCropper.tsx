'use client';

import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { ZoomIn } from 'lucide-react';
import { cn } from '@/lib/cn';

type Props = {
  imageSrc: string;
  className?: string;
  onCropChange: (area: Area | null) => void;
};

export function ProfileAvatarCropper({ imageSrc, className, onCropChange }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const onCropComplete = useCallback(
    (_: Area, croppedAreaPixels: Area) => {
      onCropChange(croppedAreaPixels);
    },
    [onCropChange],
  );

  return (
    <div className={cn('panel-avatar-sheet__crop', className)}>
      <div className="panel-avatar-sheet__crop-viewport">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      <label className="panel-avatar-sheet__zoom">
        <ZoomIn size={16} aria-hidden />
        <span className="sr-only">بزرگ‌نمایی</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.02}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={zoom}
        />
      </label>
    </div>
  );
}
