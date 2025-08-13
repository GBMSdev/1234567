import React, { useState } from 'react';
import { Search, User, Phone, Calendar, Clock, CreditCard } from 'lucide-react';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import type { Patient, Visit } from '../types';

interface PatientLookupProps {
  onPatientSelect?: (patient: Patient, visit?: Visit) => void;
}

export function PatientLookup({ onPatientSelect }: PatientLookupProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<(Patient & { currentVisit?: Visit })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Search patients by UID, phone, or name
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select(`
          *,
          visits!inner(
            id,
            status,
            queue_position,
            estimated_wait_time,
            payment_status,
            payment_amount,
            created_at,
            departments(name),
            doctors(name)
          )
        `)
        .or(`uid.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
        .eq('visits.status', 'waiting')
        .order('created_at', { ascending: false });

      if (patientsError) throw patientsError;

      const results = patients?.map(patient => ({
        ...patient,
        currentVisit: patient.visits?.[0]
      })) || [];

      setSearchResults(results);

      if (results.length === 0) {
        setError('No patients found matching your search');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search patients. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Patient Lookup</h3>
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          type="text"
          placeholder="Search by UID, phone number, or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <Button 
          onClick={handleSearch}
          disabled={isLoading}
          className="px-6"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Search Results:</h4>
          {searchResults.map((patient) => (
            <div
              key={patient.id}
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onPatientSelect?.(patient, patient.currentVisit)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{patient.name}</span>
                    <span className="text-sm text-gray-500">#{patient.uid}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {patient.phone}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Age: {patient.age}
                    </div>
                  </div>

                  {patient.currentVisit && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Department:</span>
                          <span className="ml-1 font-medium">
                            {patient.currentVisit.departments?.name}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Doctor:</span>
                          <span className="ml-1 font-medium">
                            {patient.currentVisit.doctors?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-500">Position:</span>
                          <span className="ml-1 font-medium">
                            #{patient.currentVisit.queue_position}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-500">Payment:</span>
                          <span className={`ml-1 font-medium ${
                            patient.currentVisit.payment_status === 'paid' 
                              ? 'text-green-600' 
                              : 'text-orange-600'
                          }`}>
                            {patient.currentVisit.payment_status === 'paid' ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    patient.currentVisit?.status === 'waiting'
                      ? 'bg-yellow-100 text-yellow-800'
                      : patient.currentVisit?.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {patient.currentVisit?.status || 'No active visit'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {searchResults.length === 0 && searchTerm && !isLoading && !error && (
        <div className="text-center py-8 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No patients found. Try a different search term.</p>
        </div>
      )}
    </Card>
  );
}