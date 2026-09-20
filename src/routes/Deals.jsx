import React from 'react';
import { FaFire, FaUtensils, FaHeadphones } from 'react-icons/fa';
import deal1Cropped from '../assets/crops/deal1-cropped.jpg';
import deal2Cropped from '../assets/crops/deal2-cropped.png';
import dealProfitLogo from '../assets/deal-profit-logo.png';

const Deals = () => {
  return (
    <>
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="mb-6 text-2xl font-bold text-center bg-gradient-to-r from-pink-400 to-pink-500 bg-clip-text text-transparent">
            All Deals
          </h2>
          <p className="mb-6 text-center text-lg text-gray-300">
            Browse our latest verified deals
          </p>
          <div className="grid gap-8 md:grid-cols-2">
            {/* RTX 5060 Gaming PC Deal */}
            <div className="relative group">
              <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
                <div className="relative">
                  <div className="aspect-w-4 aspect-h-3 w-full rounded-xl overflow-hidden mb-4">
                    <img
                      src={deal1Cropped}
                      alt="RTX 5060 Gaming PC - $39.99"
                      className="w-full h-full object-cover object-[center_top]"
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <FaFire className="text-pink-400" />
                      <h3 className="font-semibold text-white text-lg">RTX 5060 Gaming PC</h3>
                    </div>
                    <p className="mb-2 text-sm text-gray-300">
                      Brand new RTX 5060 gaming PC with RGB lighting
                    </p>
                    <p className="text-3xl font-bold text-pink-400">
                      $39.99
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Retail: $599.99 • Save 93%
                    </p>
                    <span className="inline-block mt-4 px-3 py-1 text-xs text-pink-400 bg-pink-500/20 rounded hover:bg-pink-500/30 transition-all">
                      FOUND BY DEAL PROFIT
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Wireless Headphones Deal */}
            <div className="relative group">
              <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
                <div className="relative">
                  <div className="aspect-w-4 aspect-h-3 w-full rounded-xl overflow-hidden mb-4">
                    <img
                      src={deal2Cropped}
                      alt="Wireless Headphones - $12.99"
                      className="w-full h-full object-cover object-[center]"
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <FaHeadphones className="text-pink-400" />
                      <h3 className="font-semibold text-white text-lg">Wireless Headphones</h3>
                    </div>
                    <p className="mb-2 text-sm text-gray-300">
                      Premium noise-cancelling Bluetooth headphones
                    </p>
                    <p className="text-3xl font-bold text-pink-400">
                      $12.99
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Retail: $129.99 • Save 90%
                    </p>
                    <span className="inline-block mt-4 px-3 py-1 text-xs text-pink-400 bg-pink-500/20 rounded hover:bg-pink-500/30 transition-all">
                      FOUND BY DEAL PROFIT
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Deals;