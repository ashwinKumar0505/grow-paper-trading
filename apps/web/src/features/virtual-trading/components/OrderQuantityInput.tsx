import { ChevronsUpDown } from 'lucide-react';
import React from 'react';

import type { OrderTicket } from '../hooks/useOrderTicket';

type Props = Pick<OrderTicket, 'action' | 'product' | 'exchange' | 'qtyText' | 'setQtyText' | 'setError' | 'isBuy' | 'heldQty' | 'reservedSell' | 'sellableQty' | 'position' | 'isExit' | 'quickQuantities' | 'value'>;

export function OrderQuantityInput({ action, product, exchange, qtyText, setQtyText, setError, isBuy, heldQty, reservedSell, sellableQty, position, isExit, quickQuantities, value }: Props) {
  return <>
        {/* Qty Row with Floating Quick-Qty Chip (matching Groww screenshot) */}
        <div className="pt-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <button
                type="button"
                disabled title="Only the quoted exchange is available"
                className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer"
              >
                <span>Qty</span>
                <strong className="font-bold text-gray-900 dark:text-white">{exchange}</strong>
                <ChevronsUpDown className="w-3 h-3 text-gray-400" />
              </button>

              {(product === 'DELIVERY' || product === 'MTF') && !isBuy && (
                <button
                  type="button"
                  onClick={() => sellableQty > 0 && setQtyText(String(sellableQty))}
                  className="block text-[11px] text-gray-400 hover:text-[#00B386] mt-0.5 cursor-pointer"
                >
                  Held: {heldQty} {reservedSell > 0 ? `(${reservedSell} open)` : ''}
                </button>
              )}
              {isExit && position && (
                <button
                  type="button"
                  onClick={() => setQtyText(String(position.quantity))}
                  className="block text-[11px] text-[#00B386] mt-0.5 cursor-pointer font-medium"
                >
                  Open {position.action}: {position.quantity} shares
                </button>
              )}
            </div>

            {/* Input with floating quick-select tooltip pill above it */}
            <div className="relative">
              <div className="absolute -top-7 right-0 z-10 flex items-center bg-[#3E434C] text-white rounded-md px-2 py-0.5 text-[11px] font-semibold shadow-sm select-none">
                {quickQuantities.map((q, idx) => (
                  <React.Fragment key={q}>
                    {idx > 0 && <span className="mx-1.5 text-gray-400 font-normal">|</span>}
                    <button
                      type="button"
                      onClick={() => {
                        setQtyText(String(q));
                        setError('');
                      }}
                      className="hover:text-[#00D09C] transition-colors cursor-pointer tabular-nums"
                    >
                      {q}
                    </button>
                  </React.Fragment>
                ))}
                {/* Little down-pointing triangle */}
                <span className="absolute -bottom-1 right-4 w-2 h-2 bg-[#3E434C] rotate-45" />
              </div>

              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={qtyText}
                onChange={(e) => {
                  setQtyText(e.target.value.replace(/[^0-9]/g, ''));
                  setError('');
                }}
                className="w-[148px] h-9 px-3 text-right text-sm font-semibold tabular-nums rounded-md border border-gray-300 dark:border-[#3A3F4B] bg-white dark:bg-[#1A1D24] text-gray-900 dark:text-white focus:outline-none focus:border-gray-800 dark:focus:border-white"
              />
            </div>
          </div>
        </div>

  </>;
}
