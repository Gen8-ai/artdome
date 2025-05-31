
import React, { useState, useEffect } from 'react';
import { pipelineManager, PipelineStage } from '@/utils/pipelineManager';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PipelineStatusProps {
  visible?: boolean;
  onClose?: () => void;
}

const PipelineStatus: React.FC<PipelineStatusProps> = ({ visible = false, onClose }) => {
  const [stages, setStages] = useState<PipelineStage[]>([]);

  useEffect(() => {
    const unsubscribe = pipelineManager.onStageUpdate(setStages);
    return unsubscribe;
  }, []);

  if (!visible) return null;

  const getStageIcon = (stage: PipelineStage) => {
    switch (stage.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Pipeline Status</CardTitle>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {stages.map((stage) => (
          <div key={stage.name} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
            <div className="flex items-center space-x-3">
              {getStageIcon(stage)}
              <span className="text-sm font-medium capitalize">
                {stage.name.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {stage.duration && (
                <span className="text-xs text-gray-500">
                  {stage.duration}ms
                </span>
              )}
              <Badge variant="secondary" className={getStageColor(stage.status)}>
                {stage.status}
              </Badge>
            </div>
          </div>
        ))}
        {stages.some(s => s.status === 'error') && (
          <div className="mt-3 p-2 bg-red-50 rounded-lg">
            <p className="text-xs text-red-600">
              Some stages failed. Check console for details.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PipelineStatus;
