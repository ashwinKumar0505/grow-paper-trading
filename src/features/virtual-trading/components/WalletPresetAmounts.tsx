import React from 'react';

interface WalletPresetAmountsProps {
  standardPresets: Array<{ label: string; value: number; sub: string }>;
  maxAllowedToAdd: number;
  selectedAddPreset: number;
  setSelectedAddPreset: (amount: number) => void;
  isCustom: boolean;
  setIsCustom: (isCustom: boolean) => void;
  tierLabel: string;
}

export const WalletPresetAmounts: React.FC<WalletPresetAmountsProps> = ({
  standardPresets,
  maxAllowedToAdd,
  selectedAddPreset,
  setSelectedAddPreset,
  isCustom,
  setIsCustom,
  tierLabel,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {standardPresets.map((preset) => {
        const exceedsLimit = preset.value > maxAllowedToAdd;
        const isSelected = !isCustom && selectedAddPreset === preset.value;
        return (
          <button
            key={preset.value}
            type="button"
            disabled={exceedsLimit}
            onClick={() => {
              setSelectedAddPreset(preset.value);
              setIsCustom(false);
            }}
            className={`p-3 rounded-xl border text-left transition-colors ${
              exceedsLimit
                ? 'opacity-40 cursor-not-allowed bg-[#111C17]/40 border-[#1E2F28]'
                : isSelected
                ? 'border-[#00D09C] bg-[#00D09C]/10 cursor-pointer'
                : 'border-[#1E2F28] hover:border-[#2E473C] bg-[#111C17] cursor-pointer'
            }`}
          >
            <div className="font-mono tabular-nums font-bold text-sm text-white">
              {preset.label}
            </div>
            <div className="text-[10px] text-[#9AB0A5] mt-0.5">
              {exceedsLimit ? `Exceeds ${tierLabel} headroom` : preset.sub}
            </div>
          </button>
        );
      })}

      {/* Fill to Max Headroom */}
      {maxAllowedToAdd > 0 && (
        <button
          type="button"
          onClick={() => {
            setSelectedAddPreset(maxAllowedToAdd);
            setIsCustom(false);
          }}
          className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
            !isCustom && selectedAddPreset === maxAllowedToAdd
              ? 'border-[#00D09C] bg-[#00D09C]/15'
              : 'border-[#00D09C]/40 bg-[#111C17] hover:border-[#00D09C]'
          }`}
        >
          <div className="font-mono tabular-nums font-bold text-sm text-[#00D09C]">
            +₹{maxAllowedToAdd.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[#9AB0A5] mt-0.5">
            Fill to {tierLabel} Cap
          </div>
        </button>
      )}
    </div>
  );
};
