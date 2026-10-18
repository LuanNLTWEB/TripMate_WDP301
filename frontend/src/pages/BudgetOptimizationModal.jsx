import { useCallback, useEffect, useState } from 'react';
import { itineraryApi } from '../services/api';
import { useToast } from '../hooks/useToast';

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

export default function BudgetOptimizationModal({ open, itinerary, onClose, onUpdated }) {
  const toast = useToast();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculate = useCallback(async (apply = false) => {
    if (!itinerary?._id) return;
    setLoading(true);
    try {
      const response = await itineraryApi.optimizeBudget(itinerary._id, apply);
      setResult(response);
      if (response.itinerary && apply) onUpdated?.(response.itinerary);
      if (apply) toast.success(response.message || 'Budget recommendations applied.');
    } catch (error) {
      toast.error(error.message || 'Unable to optimize itinerary budget.');
    } finally {
      setLoading(false);
    }
  }, [itinerary, onUpdated, toast]);

  useEffect(() => {
    if (open) {
      setResult(null);
      calculate(false);
    }
  }, [calculate, open]);

  if (!open || !itinerary) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1060 }}></div>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" style={{ zIndex: 1070 }}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h2 className="modal-title h5 fw-bold">Optimize trip budget</h2>
              <button type="button" className="btn-close" onClick={onClose} disabled={loading} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              {loading && !result ? (
                <div className="text-center py-4"><span className="spinner-border spinner-border-sm me-2"></span>Calculating recommendations...</div>
              ) : result ? (
                <>
                  <div className="row g-3 mb-4">
                    <div className="col-md-4"><div className="border rounded-3 p-3"><small className="text-muted d-block">Current total</small><strong>{formatCurrency(result.currentTotal)}</strong></div></div>
                    <div className="col-md-4"><div className="border rounded-3 p-3"><small className="text-muted d-block">Projected total</small><strong>{formatCurrency(result.optimizedTotal)}</strong></div></div>
                    <div className="col-md-4"><div className={`border rounded-3 p-3 ${result.withinBudget ? 'border-success' : 'border-warning'}`}><small className="text-muted d-block">Budget</small><strong>{result.budget > 0 ? formatCurrency(result.budget) : 'Not set'}</strong></div></div>
                  </div>
                  <div className={`alert ${result.withinBudget ? 'alert-success' : 'alert-warning'}`}>
                    {result.withinBudget ? 'This itinerary is within the configured budget.' : 'The itinerary is still above budget. Review the recommendations below.'}
                  </div>
                  {result.recommendations?.length > 0 ? (
                    <div className="vstack gap-2">
                      {result.recommendations.map((recommendation, index) => (
                        <div className="border rounded-3 p-3" key={`${recommendation.type}-${recommendation.activityId || recommendation.tourId || index}`}>
                          <div className="fw-semibold">{recommendation.type === 'remove_activity' ? `Remove activity: ${recommendation.title}` : `Review tour: ${recommendation.title}`}</div>
                          {recommendation.savings ? <div className="small text-success">Potential saving: {formatCurrency(recommendation.savings)}</div> : <div className="small text-muted">{recommendation.message}</div>}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-muted mb-0">No changes are recommended.</p>}
                </>
              ) : null}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={loading}>Close</button>
              {result?.recommendations?.some((item) => item.type === 'remove_activity') && !result.applied && (
                <button type="button" className="btn btn-primary" onClick={() => calculate(true)} disabled={loading}>{loading ? 'Applying...' : 'Apply activity recommendations'}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
