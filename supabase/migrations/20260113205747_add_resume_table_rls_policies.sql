-- RLS Policies for resume table
-- Students can manage their own resume metadata

-- Policy: Students can insert their own resume metadata
CREATE POLICY "Students can insert their own resume"
ON public.resume
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id AND
  (SELECT role FROM auth.users WHERE id = auth.uid()) = 'student'
);

-- Policy: Students can update their own resume metadata
CREATE POLICY "Students can update their own resume"
ON public.resume
FOR UPDATE
TO authenticated
USING (
  auth.uid() = student_id AND
  (SELECT role FROM auth.users WHERE id = auth.uid()) = 'student'
)
WITH CHECK (
  auth.uid() = student_id AND
  (SELECT role FROM auth.users WHERE id = auth.uid()) = 'student'
);

-- Policy: Students can read their own resume metadata
CREATE POLICY "Students can read their own resume"
ON public.resume
FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id AND
  (SELECT role FROM auth.users WHERE id = auth.uid()) = 'student'
);

-- Policy: Students can delete their own resume metadata
CREATE POLICY "Students can delete their own resume"
ON public.resume
FOR DELETE
TO authenticated
USING (
  auth.uid() = student_id AND
  (SELECT role FROM auth.users WHERE id = auth.uid()) = 'student'
);
