import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type AddTournamentProps = {
  onBack: () => void;
};

const AddTournament: React.FC<AddTournamentProps> = ({ onBack }) => {
  const [tournamentName, setTournamentName] = useState('');
  const [format, setFormat] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [venue, setVenue] = useState('');
  const [maxTeams, setMaxTeams] = useState('');
  const [description, setDescription] = useState('');
  const [prizes, setPrizes] = useState([{ position: '1st Place', prize: '' }]);
  const [rules, setRules] = useState('');

  const formats = [
    'League (Round Robin)',
    'Knockout',
    'Group Stage + Knockout',
    'Swiss System'
  ];

  const addPrize = () => {
    const positions = ['1st Place', '2nd Place', '3rd Place', '4th Place'];
    const nextPosition = positions[prizes.length] || `${prizes.length + 1}th Place`;
    setPrizes([...prizes, { position: nextPosition, prize: '' }]);
  };

  const removePrize = (index: number) => {
    setPrizes(prizes.filter((_, i) => i !== index));
  };

  const updatePrize = (index: number, field: string, value: string) => {
    const updatedPrizes = prizes.map((prize, i) => 
      i === index ? { ...prize, [field]: value } : prize
    );
    setPrizes(updatedPrizes);
  };

  const handleSubmit = () => {
    const tournamentData = {
      name: tournamentName,
      format,
      startDate,
      endDate,
      venue,
      maxTeams: parseInt(maxTeams),
      description,
      prizes: prizes.filter(p => p.prize.trim() !== ''),
      rules,
      teams: [],
      matches: [],
      pointsTable: [],
      status: 'upcoming',
      createdAt: new Date()
    };
    console.log('Tournament created:', tournamentData);
    onBack();
  };

  return (
    <div className="px-4 py-5 space-y-5 pb-24">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Tournament Name</label>
          <Input
            placeholder="Enter tournament name"
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            className="py-3 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Format</label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="py-3 border border-gray-300 rounded-lg">
              <SelectValue placeholder="Select tournament format" />
            </SelectTrigger>
            <SelectContent>
              {formats.map((fmt) => (
                <SelectItem key={fmt} value={fmt.toLowerCase().replace(/[^\w]/g, '_')}>
                  {fmt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="py-3 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="py-3 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Venue</label>
            <Input
              placeholder="Tournament venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="py-3 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Max Teams</label>
            <Input
              type="number"
              placeholder="Number of teams"
              value={maxTeams}
              onChange={(e) => setMaxTeams(e.target.value)}
              className="py-3 border border-gray-300 rounded-lg"
              min="2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <Textarea
            placeholder="Enter tournament description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border border-gray-300 rounded-lg"
            rows={3}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-medium">Prizes</label>
            <Button
              onClick={addPrize}
              variant="outline"
              size="sm"
              className="text-purple-600 border-purple-600 hover:bg-purple-50"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Prize
            </Button>
          </div>

          <div className="space-y-3">
            {prizes.map((prize, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium">{prize.position}</h4>
                  {prizes.length > 1 && (
                    <button
                      onClick={() => removePrize(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <Input
                  placeholder="Enter prize details"
                  value={prize.prize}
                  onChange={(e) => updatePrize(index, 'prize', e.target.value)}
                  className="border border-gray-300 rounded-lg"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Rules & Regulations</label>
          <Textarea
            placeholder="Enter tournament rules and regulations"
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            className="border border-gray-300 rounded-lg"
            rows={4}
          />
        </div>

        <div className="flex gap-4">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex-1 py-3 border-gray-300 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            disabled={!tournamentName.trim() || !format || !startDate}
          >
            Create Tournament
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddTournament;