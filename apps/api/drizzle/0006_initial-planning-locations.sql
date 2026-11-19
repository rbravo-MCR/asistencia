-- Valores iniciales confirmados de negocio; se insertan una vez, sin reiniciar la configuración al arrancar.
INSERT INTO shift_templates (default_key, name, category, modality, start_time, end_time, weekdays, time_zone)
VALUES
 ('ADMINISTRATIVE_INITIAL', 'Jornada administrativa', 'ADMINISTRATIVE', 'ONSITE', '08:00', '17:00', '[1,2,3,4,5]'::jsonb, 'America/Merida'),
 ('OPERATIONAL_INITIAL_1', 'Turno operativo 1', 'OPERATIONAL', 'HOME_OFFICE', '08:00', '16:00', '[1,2,3,4,5,6,7]'::jsonb, 'America/Merida'),
 ('OPERATIONAL_INITIAL_2', 'Turno operativo 2', 'OPERATIONAL', 'HOME_OFFICE', '16:00', '00:00', '[1,2,3,4,5,6,7]'::jsonb, 'America/Merida'),
 ('OPERATIONAL_INITIAL_3', 'Turno operativo 3', 'OPERATIONAL', 'HOME_OFFICE', '00:00', '08:00', '[1,2,3,4,5,6,7]'::jsonb, 'America/Merida')
ON CONFLICT (default_key) DO NOTHING;
--> statement-breakpoint
INSERT INTO work_locations (id, name, latitude, longitude, radius_meters, max_accuracy_meters, active)
VALUES ('81212000-0000-4000-8000-000000000001', 'Centro de trabajo principal', 21.0364532482013, -89.62273424224803, 10, 10, true)
ON CONFLICT (id) DO NOTHING;
